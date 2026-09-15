import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useMutation } from '@apollo/client';
import { useSelector, useDispatch, useStore } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import {
  LiveKitRoom,
  useLocalParticipant,
  useIsSpeaking,
  useConnectionState,
} from '@livekit/react-native';
import {
  ConnectionState,
  LogLevel,
} from 'livekit-client';
import AudioManager from '../../services/webrtc/audio-manager';
import VideoManager from '../../services/webrtc/video-manager';
import ScreenshareManager from '../../services/webrtc/screenshare-manager';
import logger from '../../services/logger';
import useMeeting from '../../graphql/hooks/useMeeting';
import { useAudioJoin, invalidateInFlightAudioJoin } from '../../hooks/use-audio-join';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import { usePrimaryLiveKitMembership } from '../../graphql/hooks/useLiveKitMemberships';
import {
  applyLiveKitSdkLogLevel,
  installLiveKitSdkLogBridge,
} from '../../services/livekit/sdk-log-bridge.ts';
import {
  liveKitRoom,
  disconnectLiveKitRoom,
  liveKitEvents,
  applyRoomOptions,
  resolveRoomOptions,
  hasConnectedOnce,
  isReconnectingState,
  LK_FATAL_ERROR_EVENT,
} from '../../services/livekit';
import {
  setIsConnected,
  setIsConnecting,
  setIsReconnecting,
  setMediaInterrupted,
} from '../../store/redux/slices/wide-app/audio';
import {
  hideNotification,
  setProfile,
} from '../../store/redux/slices/wide-app/notification-bar';
import { USER_SET_TALKING } from './mutations';
import SelectiveSubscription from './selective-subscription/index.tsx';
import useMeetingSettings from '../../graphql/local-states/useMeetingSettings';

// Cap consecutive fatal-error-driven reconnects so a persistently failing link
// (e.g. audio publish that keeps timing out) can't spin an unbounded
// disconnect/connect loop. Mirrors the web client's MAX_CONN_ATTEMPTS. The
// counter is reset once the link has been stable (no fatal error) for
// FATAL_RECONNECT_STABLE_MS, so only *rapid consecutive* failures exhaust it.
const MAX_FATAL_RECONNECT_ATTEMPTS = 10;
const FATAL_RECONNECT_STABLE_MS = 30000;
const TALKING_CLEAR_GRACE_MS = 500;
// livekit-client's own backoff only applies to LiveKit Cloud URLs, so on a
// self-hosted deployment a failed connect is retried the instant the SDK flips
// the room back to Disconnected. Web client values.
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 8000;
// Hard give-up: at the cap the loop stops for good and the user is told to
// leave and rejoin - the mobile counterpart of the web client's page refresh.
// Same budget as the web client (~55s of backoff); a longer mobile outage is
// covered by the budget revivals below, not by a larger cap.
const MAX_RECONNECT_ATTEMPTS = 10;
// NetInfo only emits on change, so an offline latch cannot clear itself. This
// component owns the only liveKitRoom.connect() call site, so a gate that stays
// latched is permanent media death: always fail open.
const OFFLINE_GATE_FAILOPEN_MS = 30000;
// How long the room may sit outside Connected before the client stops trusting
// the SDK's own recovery and tears the session down itself. Web client value.
const RECONNECT_STALL_TIMEOUT_MS = 60000;
const MAX_STALL_RECONNECT_ATTEMPTS = 10;
// The stall gate's own offline budget. It cannot ride on the connect loop's
// fail-open above: that one clears in half a stall window, so it is always open
// again by the time a window elapses. The gate still has to fail open - the
// detector is the only rescue for a room parked in Reconnecting - just on a
// budget longer than the window it guards.
const STALL_OFFLINE_GATE_MAX_MS = 300000;
// Room.disconnect() awaits a leave that can stay pending forever on a half-open
// socket, which is the very case the stall detector fires on.
const FORCED_DISCONNECT_TIMEOUT_MS = 5000;
// A signal resume keeps publications and usually settles, so it is given longer
// before the user is told anything at all.
const MEDIA_INTERRUPTED_NOTICE_GRACE_MS = 1000;
const SIGNAL_RESUME_NOTICE_GRACE_MS = 5000;

const LiveKitObserver = ({
  room,
  usingAudio,
  usingCamera,
  setReconnectingNotice,
}) => {
  const dispatch = useDispatch();
  const mainRoomBlockedByBreakout = useSelector(
    (state) => state.client.sessionState.mainRoomBlockedByBreakout,
  );
  const { localParticipant } = useLocalParticipant();
  // Both call sites below fire precisely when the transport may be down (room
  // drop, session teardown), and an Apollo rejection surfaces on RN as a visible
  // unhandled-rejection warning.
  const [setUserTalking] = useMutation(USER_SET_TALKING, {
    onError: (error) => {
      logger.debug({
        logCode: 'livekit_talking_mutation_failure',
        extraInfo: { errorMessage: error?.message },
      }, `LiveKit: talking state mutation failed - ${error?.message}`);
    },
  });
  const isSpeaking = useIsSpeaking(localParticipant);
  const connectionState = useConnectionState(room);
  const { data: currentUserData } = useCurrentUser();
  const joinedVoice = currentUserData?.user_current[0]?.voice?.joined ?? false;
  const isMuted = useSelector((state) => state.audio.isMuted);
  const isConnected = useSelector((state) => state.audio.isConnected);
  const audioManagerInitialized = useSelector((state) => state.audio.audioManagerInitialized);

  useEffect(() => {
    logger.debug({
      logCode: 'livekit_conn_state_changed',
      extraInfo: {
        connectionState,
      },
    }, `LiveKit conn state changed: ${connectionState}`);
  }, [connectionState]);

  const isRoomConnected = connectionState === ConnectionState.Connected;
  const speakingIsFrozen = useRef(false);

  useEffect(() => {
    if (!usingAudio) return undefined;

    if (!isRoomConnected) {
      speakingIsFrozen.current = true;
      // The server clears the talking state on a LiveKit drop as well, but on a
      // deliberately longer grace period; clearing it here too retires the
      // indicator quickly whenever the GraphQL link outlives the media one.
      const timer = setTimeout(() => {
        setUserTalking({ variables: { talking: false } });
      }, TALKING_CLEAR_GRACE_MS);

      return () => clearTimeout(timer);
    }

    if (speakingIsFrozen.current) {
      // The SDK only moves isSpeaking on active-speaker events, so it still
      // reads true after a drop mid-utterance: wait for a real pause before
      // trusting it again, or the reconnect re-asserts what the timer cleared.
      if (isSpeaking) return undefined;

      speakingIsFrozen.current = false;
    }

    setUserTalking({ variables: { talking: isSpeaking } });

    return undefined;
  }, [isSpeaking, isMuted, usingAudio, isRoomConnected]);

  useEffect(() => {
    if (!usingAudio) return;

    if (!isConnected
      && connectionState === ConnectionState.Connected
      && joinedVoice
      && audioManagerInitialized) {
      AudioManager.onAudioJoin();
    }
  }, [isConnected, connectionState, joinedVoice, audioManagerInitialized]);

  // A room reports Disconnected before it has ever connected as well, and
  // entering a breakout tears this one down while the component stays mounted:
  // neither is an interruption of a session the user is in.
  const isMediaInterrupted = hasConnectedOnce()
    && !mainRoomBlockedByBreakout
    && connectionState !== ConnectionState.Connected;
  const isResuming = connectionState === ConnectionState.SignalReconnecting;

  useEffect(() => {
    // The notice promises audio and video back: a room kept around only to
    // receive a screenshare while the user's audio is on FreeSWITCH is not
    // something to warn about.
    if (!isMediaInterrupted || !(usingAudio || usingCamera)) {
      setReconnectingNotice(false);
      dispatch(hideNotification('mediaReconnecting'));

      return undefined;
    }

    // Only the condition is raised here: the bar has one slot and a dismiss
    // latch, both of which are arbitrated by BBBLiveKitRoom's single effect.
    const timer = setTimeout(() => {
      setReconnectingNotice(true);
    }, isResuming ? SIGNAL_RESUME_NOTICE_GRACE_MS : MEDIA_INTERRUPTED_NOTICE_GRACE_MS);

    return () => clearTimeout(timer);
  }, [isMediaInterrupted, isResuming, usingAudio, usingCamera, setReconnectingNotice, dispatch]);

  useEffect(() => {
    if (!usingAudio) return;

    dispatch(setMediaInterrupted(isMediaInterrupted && !isResuming));
  }, [isMediaInterrupted, isResuming, usingAudio, dispatch]);

  // Clearing this from the effect above's cleanup would flicker the flag
  // through Redux on every transition.
  useEffect(() => () => {
    dispatch(setMediaInterrupted(false));
  }, [dispatch]);

  return null;
};

const BBBLiveKitRoom = ({ children }) => {
  const { data: currentUserData } = useCurrentUser();
  const host = useSelector((state) => state.client.meetingData.host);
  const directHost = useSelector((state) => state.client.meetingData.directHost);
  const dispatch = useDispatch();
  const store = useStore();
  const { joinAudio } = useAudioJoin();
  const { data: meetingData, loading: meetingLoading } = useMeeting();
  const sessionToken = useSelector((state) => state.client.meetingData.sessionToken);
  const isClientConnected = useSelector((state) => state.client.sessionState.connected);
  const isClientLoggedIn = useSelector((state) => state.client.sessionState.loggedIn);
  const isAudioConnected = useSelector((state) => state.audio.isConnected);
  const isAudioConnecting = useSelector(({ audio }) => audio.isConnecting || audio.isReconnecting);
  const mainRoomBlockedByBreakout = useSelector((state) => state.client.sessionState.mainRoomBlockedByBreakout);
  const connectionState = useConnectionState(liveKitRoom);
  const [meetingSettings] = useMeetingSettings();

  const url = meetingSettings?.public
    ? (meetingSettings.public?.media?.livekit?.url || `wss://${host}/livekit`)
    : null;
  // The effective default is the server's (settings.yml has shipped true since
  // cb9ec3cdf7); the ?? false fallback only covers a server predating the key.
  const reconnectOnFatalFailures = meetingSettings?.public?.media?.livekit
    ?.reconnectOnFatalFailures ?? false;
  // The settings var is replaced wholesale before this component mounts, so the
  // initial values never supply a default: without one, a deployment that omits
  // logLevel leaves livekit-client at its own, more verbose, built-in default.
  const sdkLogLevel = meetingSettings?.public?.media?.livekit?.logLevel ?? LogLevel.warn;
  const sdkLogBridge = meetingSettings?.public?.media?.livekit?.sdkLogBridge ?? true;
  const selectiveSubscriptionEnabled = meetingSettings?.public?.media?.livekit
    ?.selectiveSubscription?.enabled ?? true;
  const configuredRoomOptions = meetingSettings?.public?.media?.livekit?.roomOptions;
  // A fresh object per render would re-run the connect effect.
  const roomOptions = useMemo(
    () => resolveRoomOptions(configuredRoomOptions),
    [configuredRoomOptions],
  );
  const fatalReconnectAttempts = useRef(0);
  const fatalReconnectResetTimer = useRef(null);
  const primaryMembership = usePrimaryLiveKitMembership();
  const livekitToken = primaryMembership?.token;
  // Tokens are regenerated periodically: connect on token presence, not its
  // value, so a token refresh doesn't re-run it (ie causes an uneeded reconnect)
  const hasLiveKitToken = typeof livekitToken === 'string' && livekitToken.length > 0;
  const initialLiveKitToken = useRef(null);
  const userId = currentUserData?.user_current[0]?.userId;

  if (hasLiveKitToken && !initialLiveKitToken.current) initialLiveKitToken.current = livekitToken;

  const {
    cameraBridge,
    screenShareBridge,
    audioBridge,
  } = meetingData?.meeting[0] || {};
  const usingAudio = audioBridge === 'livekit';
  const usingCamera = cameraBridge === 'livekit';
  const shouldUseLiveKit = cameraBridge === 'livekit'
    || screenShareBridge === 'livekit'
    || usingAudio;
  // Selective subscription on mobile is audio only for now. There is no manual
  // camera/screenshare subscription, so autoSubscribe:false is only safe when
  // LiveKit carries audio alone: if it also carries camera or screenshare,
  // autoSubscribe:false would leave that video unsubscribed (blank).
  const manageAudioSubscriptions = usingAudio
    && selectiveSubscriptionEnabled
    && !(cameraBridge === 'livekit' || screenShareBridge === 'livekit');
  const connectOptions = useMemo(
    () => ({ autoSubscribe: !manageAudioSubscriptions }),
    [manageAudioSubscriptions],
  );

  const mounted = useRef(true);
  const connAttempts = useRef(0);
  const reconnectPending = useRef(false);
  const reconnectTimer = useRef(null);
  const hasEverConnected = useRef(false);
  const reconnectNotice = useRef({ room: false, fatal: false });
  const isOffline = useRef(false);
  const wasOffline = useRef(false);
  const offlineSince = useRef(null);
  const lastNetInfoType = useRef(null);
  const offlineFailOpen = useRef(null);
  const prevRoomAppState = useRef(AppState.currentState);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const stallSince = useRef(null);
  const stallReconnectAttempts = useRef(0);
  const stallExhausted = useRef(false);
  const forcedReconnectInFlight = useRef(false);
  const prevAppState = useRef(AppState.currentState);
  const [stallEpoch, setStallEpoch] = useState(0);
  // The stall detector has to re-run on a resume, so the app state is state
  // here and a ref in the reconnect budget's listener.
  const [appState, setAppState] = useState(AppState.currentState);
  // Raised by LiveKitObserver once an interruption outlives its grace window.
  // The effect below needs it to tell "there is something to show" from "the
  // user has not been told yet", which is what the grace window buys.
  const [reconnectingNotice, setReconnectingNotice] = useState(false);
  const barProfile = useSelector((state) => state.notificationBar.profile);
  const noticeDismissed = useSelector(
    (state) => state.notificationBar.dismissed.mediaReconnectFailed ?? false,
  );
  const reconnectingDismissed = useSelector(
    (state) => state.notificationBar.dismissed.mediaReconnecting ?? false,
  );
  // The scheduler reads these at fire time, so it always connects with the
  // current token and options without the backoff restarting on a refresh.
  const livekitTokenRef = useRef(livekitToken);
  const connectOptionsRef = useRef(connectOptions);
  const roomOptionsRef = useRef(roomOptions);

  livekitTokenRef.current = livekitToken;
  connectOptionsRef.current = connectOptions;
  roomOptionsRef.current = roomOptions;

  const armOfflineFailOpen = useCallback(() => {
    if (offlineFailOpen.current) return;

    offlineFailOpen.current = setTimeout(() => {
      offlineFailOpen.current = null;
      isOffline.current = false;
      setReconnectEpoch((p) => p + 1);
    }, OFFLINE_GATE_FAILOPEN_MS);
  }, []);

  const clearOfflineFailOpen = useCallback(() => {
    if (!offlineFailOpen.current) return;

    clearTimeout(offlineFailOpen.current);
    offlineFailOpen.current = null;
  }, []);

  // The room loop and the fatal-error loop have separate budgets and separate
  // resets, so one shared flag would let either wipe a notice the other still
  // needs.
  const notifyReconnectExhausted = useCallback((source, extraInfo) => {
    if (reconnectNotice.current[source]) return;

    reconnectNotice.current[source] = true;
    logger.warn({
      logCode: 'livekit_reconnect_exhausted',
      extraInfo: { source, ...extraInfo },
    }, `LiveKit: reconnect attempts exhausted (${source})`);
    dispatch(setProfile({ profile: 'mediaReconnectFailed' }));
  }, [dispatch]);

  const clearReconnectNotice = useCallback((source) => {
    if (!reconnectNotice.current[source]) return;

    reconnectNotice.current[source] = false;

    if (!reconnectNotice.current.room && !reconnectNotice.current.fatal) {
      dispatch(hideNotification('mediaReconnectFailed'));
    }
  }, [dispatch]);

  // Leaving and rejoining the meeting is an expensive recovery on mobile - and
  // in embeddable-SDK mode it is the host app's to offer - so the two events
  // that plausibly change the outcome of a dead loop buy it a fresh budget.
  const reviveReconnect = useCallback((reason) => {
    if (connAttempts.current > 0 || reconnectNotice.current.room) {
      logger.debug({
        logCode: 'livekit_reconnect_budget_reset',
        extraInfo: { reason, attempts: connAttempts.current },
      }, `LiveKit: reconnect budget reset (${reason})`);
      connAttempts.current = 0;
      clearReconnectNotice('room');
    }

    // Unconditional: a room the detector gave up on is parked outside
    // Disconnected, so connAttempts was never spent and no room notice was ever
    // raised - the guard above is false in exactly the state the give-up
    // produces, and nothing else would ever clear this. The counter goes with
    // the flag: clearing the latch alone re-arms the detector with a spent
    // budget, which re-latches on the next window. The epoch bump is what
    // re-runs the detector: the refs alone would not.
    stallReconnectAttempts.current = 0;
    stallExhausted.current = false;
    // The window is re-measured on a reattach only: the SDK resumes by itself
    // once the link is back, and a window that kept running through the outage
    // would let a forced reconnect pre-empt that resume by seconds. The other
    // reasons repeat on a flapping transport, which would defer the detector
    // for good.
    if (reason === 'netinfo_reattached') stallSince.current = Date.now();
    setStallEpoch((p) => p + 1);

    // Unconditional: the offline gate returns without spending an attempt, so a
    // link that drops and returns before any attempt is counted leaves the
    // epoch as the only thing that runs the scheduler again. The scheduler
    // re-checks every gate, so a bump with nothing to do is a no-op.
    setReconnectEpoch((p) => p + 1);
  }, [clearReconnectNotice]);

  // Both the fatal-error handler and the stall detector below recover by tearing
  // the session down and letting the reconnect effect rebuild it. The two
  // refusals are told apart because they are not equally terminal: a mutex
  // collision is worth retrying, a spent room budget never is.
  const forceRoomReconnect = useCallback(({ source, resetAudio }) => {
    if (forcedReconnectInFlight.current) return 'in_flight';

    // Nothing reconnects a room whose budget is spent, so disconnecting here
    // would turn a session the SDK might still recover into a dead one.
    if (connAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      logger.warn({
        logCode: 'livekit_forced_reconnect_skipped',
        extraInfo: { source, attempts: connAttempts.current },
      }, `LiveKit: forced reconnect skipped, room reconnect budget exhausted (${source})`);
      notifyReconnectExhausted('room', {
        attempts: connAttempts.current,
        max: MAX_RECONNECT_ATTEMPTS,
        source,
      });

      return 'budget_exhausted';
    }

    forcedReconnectInFlight.current = true;

    // AudioManager.exitAudio() is bridge-agnostic and the detector arms whenever
    // any bridge is on LiveKit, so an ungated teardown would kill a healthy
    // bbb-webrtc-sfu audio session because a video room stalled.
    if (resetAudio) {
      invalidateInFlightAudioJoin();
      AudioManager.exitAudio();
      // Cleared before the disconnect, not in its continuation: the state change
      // can re-fire the join effect first and read a stale isConnected:true.
      dispatch(setIsConnected(false));
      dispatch(setIsConnecting(false));
      dispatch(setIsReconnecting(false));
    }

    let timeout = null;
    // Bounded: disconnect() awaits a leave that can stay pending forever on the
    // half-open socket this path exists for, latching the mutex with it. It
    // stops the captures as well, which is what mobile needs: publishing goes
    // through setCameraEnabled and no LocalVideoTrack reference is kept, so a
    // surviving track would be a running capture nothing can reach.
    Promise.race([
      liveKitRoom.disconnect(),
      new Promise((resolve) => {
        timeout = setTimeout(resolve, FORCED_DISCONNECT_TIMEOUT_MS);
      }),
    ])
      .catch((error) => logger.error({
        logCode: 'livekit_forced_reconnect_disconnect_error',
        extraInfo: { source, errorMessage: error?.message },
      }, `LiveKit: forced reconnect disconnect failed (${source})`))
      .finally(() => {
        if (timeout) clearTimeout(timeout);
        forcedReconnectInFlight.current = false;
      });

    return 'started';
  }, [dispatch, notifyReconnectExhausted]);

  const initializeMediaManagers = (bridges) => {
    const mediaManagerConfigs = {
      userId,
      host,
      directHost,
      sessionToken,
      logger
    };
    if (bridges.cameraBridge === 'bbb-webrtc-sfu') VideoManager.init(mediaManagerConfigs);
    if (bridges.screenShareBridge === 'bbb-webrtc-sfu') ScreenshareManager.init(mediaManagerConfigs);

    // AudioManager is always initialized (used by all bridges)
    return AudioManager.init(mediaManagerConfigs);
  };

  useEffect(() => {
    if (!sdkLogBridge) return;

    installLiveKitSdkLogBridge();
  }, [sdkLogBridge]);

  // loglevel only honours a persisted level, which React Native has no storage
  // for, so livekit-client resets every logger to the deployment level whenever
  // it builds an RTCEngine - dropping the engine floor on each reconnect.
  useEffect(() => {
    applyLiveKitSdkLogLevel(sdkLogLevel);
  }, [sdkLogLevel, connectionState]);

  useEffect(() => {
    if (sessionToken
      && host
      && userId
      && !meetingLoading
      && (audioBridge && cameraBridge && screenShareBridge)
      && isClientConnected
      && isClientLoggedIn
      && !mainRoomBlockedByBreakout
    ) {
      initializeMediaManagers({ audioBridge, cameraBridge, screenShareBridge })
        .then(async () => {
          // Pull audio flags and room state directly from the source as this
          // needs to be the latest state, since multiple locations can trigger
          // this effect with potentially stale values on React's render cycle.
          const { isConnected, isConnecting, isReconnecting } = store.getState().audio;

          if (isConnected || isConnecting || isReconnecting) return;

          // A join issued while the room is down either fast-fails on the next
          // attempt or burns the whole room-connection timeout, and every
          // failure re-acquires the mic and tears the bridge back down. Wait for
          // the Connected edge instead - connectionState is in the deps.
          // usingAudio is load-bearing: only LiveKit audio needs the room, and a
          // meeting with no LiveKit media at all never leaves Disconnected.
          if (usingAudio && liveKitRoom.state !== ConnectionState.Connected) return;

          await joinAudio();
        })
        .catch((initError) => {
          logger.error({
            logCode: 'media_manager_init_failure',
            extraInfo: {
              errorCode: initError.code,
              errorMessage: initError.message,
            },
          }, `Media manager initialization failed: ${initError.message}`);
        });
    }
  }, [
    sessionToken,
    host,
    userId,
    meetingLoading,
    isClientConnected,
    isClientLoggedIn,
    connectionState,
    mainRoomBlockedByBreakout,
    isAudioConnected,
    isAudioConnecting,
    hasLiveKitToken,
    url,
    usingAudio,
    joinAudio,
  ]);

  // Room (re)connect scheduling. Every guard is claimed synchronously, before
  // any await, so two effect runs cannot both take the slot.
  useEffect(() => {
    if (!shouldUseLiveKit) return undefined;
    if (connectionState !== ConnectionState.Disconnected) return undefined;
    if (!hasLiveKitToken || !url) return undefined;
    if (mainRoomBlockedByBreakout || !isClientConnected || !isClientLoggedIn) return undefined;
    if (reconnectPending.current) return undefined;

    if (connAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      notifyReconnectExhausted('room', {
        attempts: connAttempts.current,
        max: MAX_RECONNECT_ATTEMPTS,
        url,
      });

      return undefined;
    }

    if (isOffline.current) {
      armOfflineFailOpen();

      return undefined;
    }

    const attempt = connAttempts.current;
    connAttempts.current = attempt + 1;
    reconnectPending.current = true;
    // Only the very first connect of this component's life is immediate: a room
    // that connects and drops right away must not hot-loop.
    const delay = (attempt === 0 && !hasEverConnected.current)
      ? 0
      : Math.min(RECONNECT_BASE_DELAY_MS * (2 ** Math.max(0, attempt - 1)), RECONNECT_MAX_DELAY_MS);

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;

      if (!mounted.current) {
        reconnectPending.current = false;

        return;
      }

      // Re-read the gate at fire time. The effect deliberately does not cancel
      // on dep change - mobile's dep set flips during a reconnect and would
      // restart the wait forever - so a scheduled connect can outlive its
      // preconditions, breakout entry being the one that matters.
      const { client } = store.getState();

      if (client.sessionState.mainRoomBlockedByBreakout
        || !client.sessionState.connected
        || !client.sessionState.loggedIn
        || liveKitRoom.state !== ConnectionState.Disconnected) {
        reconnectPending.current = false;

        return;
      }

      if (isOffline.current) {
        // Refund: an interface that detaches during the wait must not cost an
        // attempt on a connect that cannot succeed.
        connAttempts.current = Math.max(0, connAttempts.current - 1);
        reconnectPending.current = false;
        armOfflineFailOpen();

        return;
      }

      applyRoomOptions(liveKitRoom, roomOptionsRef.current);
      logger.debug({
        logCode: 'livekit_room_options_applied',
        extraInfo: {
          roomOptions: roomOptionsRef.current,
        },
      }, 'LiveKit room options applied');

      liveKitRoom.connect(url, livekitTokenRef.current, connectOptionsRef.current)
        .catch((error) => {
          logger.warn({
            logCode: 'livekit_connect_retry_error',
            extraInfo: {
              attempt: attempt + 1,
              errorMessage: error?.message,
            },
          }, `LiveKit: reconnect attempt ${attempt + 1} failed - ${error?.message}`);
        })
        .finally(() => {
          reconnectPending.current = false;
          // The SDK emits the Disconnected state change before connect()
          // rejects, so re-firing this effect through connectionState alone
          // would depend on React's scheduling order.
          if (liveKitRoom.state === ConnectionState.Disconnected) setReconnectEpoch((p) => p + 1);
        });
    }, delay);

    return undefined;
  }, [
    shouldUseLiveKit,
    connectionState,
    hasLiveKitToken,
    url,
    reconnectEpoch,
    mainRoomBlockedByBreakout,
    isClientConnected,
    isClientLoggedIn,
    notifyReconnectExhausted,
    armOfflineFailOpen,
  ]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    hasEverConnected.current = true;
    connAttempts.current = 0;
    reconnectPending.current = false;
    clearReconnectNotice('room');
  }, [connectionState, clearReconnectNotice]);

  // livekit-client does not always emit Disconnected for a session it has
  // stopped trying to restore, and the effect above only (re)connects on
  // Disconnected, so a room parked in Reconnecting would stay there for good.
  useEffect(() => {
    if (!shouldUseLiveKit || mainRoomBlockedByBreakout) {
      stallSince.current = null;

      return undefined;
    }

    if (connectionState === ConnectionState.Connected) {
      stallReconnectAttempts.current = 0;
      stallExhausted.current = false;
    }

    if (!isReconnectingState(connectionState)) {
      stallSince.current = null;

      return undefined;
    }

    if (stallExhausted.current) return undefined;

    // The detector stays armed while backgrounded: background audio is
    // first-class here (iOS UIBackgroundModes, an Android foreground service),
    // and screen-off listening is exactly where a silent stall goes unnoticed.
    // Only a recorded background -> active resume restarts the window -
    // prevAppState is written nowhere else and only for those two states, so
    // the iOS transients (notification shade, app switcher, permission prompts)
    // cannot be used to defer the countdown indefinitely.
    if (prevAppState.current === 'background' && appState === 'active') {
      stallSince.current = Date.now();
    }

    if (appState === 'active' || appState === 'background') prevAppState.current = appState;

    // One continuous window across the whole reconnecting period: a
    // Reconnecting <-> SignalReconnecting flap must not restart the countdown.
    if (stallSince.current == null) stallSince.current = Date.now();

    const delay = Math.max(0, RECONNECT_STALL_TIMEOUT_MS - (Date.now() - stallSince.current));
    const timer = setTimeout(() => {
      // A detached interface gates the connect loop for the same reason it has
      // to gate this one: a forced reconnect tears the bridge down for an
      // attempt that cannot reach the server, so the window is given back
      // instead of an attempt being spent. isOffline alone would not hold: it
      // fails open mid-window, while wasOffline is precisely "detached and not
      // seen attached since" and is bounded by the budget above instead.
      const offline = isOffline.current
        || (wasOffline.current
          && offlineSince.current !== null
          && Date.now() - offlineSince.current < STALL_OFFLINE_GATE_MAX_MS);

      if (offline) {
        stallSince.current = Date.now();
        setStallEpoch((p) => p + 1);

        return;
      }

      if (stallReconnectAttempts.current >= MAX_STALL_RECONNECT_ATTEMPTS) {
        stallExhausted.current = true;
        logger.error({
          logCode: 'livekit_reconnect_stalled_exhausted',
          extraInfo: { connectionState, attempts: stallReconnectAttempts.current },
        }, 'LiveKit: stalled-room reconnects exhausted');
        // Terminal: the room is parked outside Disconnected and the detector is
        // done, so the user gets the same "leave and rejoin" notice the room
        // loop's give-up raises instead of a reconnecting bar that never ends.
        notifyReconnectExhausted('room', {
          source: 'reconnect_stalled',
          attempts: stallReconnectAttempts.current,
          max: MAX_STALL_RECONNECT_ATTEMPTS,
        });

        return;
      }

      logger.warn({
        logCode: 'livekit_reconnect_stalled',
        extraInfo: {
          state: connectionState,
          url,
          attempts: stallReconnectAttempts.current + 1,
        },
      }, `LiveKit: room stalled (state=${connectionState}), forcing a reconnect`);

      const result = forceRoomReconnect({
        source: 'reconnect_stalled',
        resetAudio: usingAudio,
      });

      if (result === 'budget_exhausted') {
        // There is nothing left for the detector to trigger, so it goes quiet
        // instead of re-arming on every state change.
        stallExhausted.current = true;

        return;
      }

      if (result === 'in_flight') {
        // A forced reconnect from the fatal path is still resolving: it may
        // well fix the stall, and the budget it would have spent is intact, so
        // the window is given back rather than closed for the session.
        stallSince.current = Date.now();
        setStallEpoch((p) => p + 1);

        return;
      }

      stallReconnectAttempts.current += 1;
      // Re-primed rather than nulled: a disconnect that leaves the room in
      // Reconnecting emits no state change, so nothing would re-run this effect
      // and the remaining attempts would be unreachable.
      stallSince.current = Date.now();
      setStallEpoch((p) => p + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [
    shouldUseLiveKit,
    mainRoomBlockedByBreakout,
    connectionState,
    appState,
    url,
    stallEpoch,
    usingAudio,
    forceRoomReconnect,
    notifyReconnectExhausted,
  ]);

  useEffect(() => {
    // isConnected === false is interface attachment and nothing else.
    // isInternetReachable is a public-internet probe (a captive-portal check on
    // Android, a HEAD to a Google endpoint on iOS) that settles at false forever
    // on LAN-only, egress-filtered and many VPN deployments - exactly the ones
    // where the BBB server is reachable - so it must never gate a loop that
    // gives up for good. It is not read here.
    const unsubscribe = NetInfo.addEventListener(({ isConnected, type }) => {
      // The listener is handed the cached state synchronously on registration,
      // so the first event is not a transport change and must not revive.
      const changedTransport = lastNetInfoType.current !== null && type !== lastNetInfoType.current;
      lastNetInfoType.current = type;

      if (isConnected === false) {
        isOffline.current = true;
        wasOffline.current = true;
        // Not re-stamped while the device stays detached, so the stall gate's
        // budget is a ceiling on the outage rather than on the last event.
        if (offlineSince.current === null) offlineSince.current = Date.now();
        armOfflineFailOpen();

        return;
      }

      isOffline.current = false;
      clearOfflineFailOpen();

      const reattached = wasOffline.current;
      wasOffline.current = false;
      offlineSince.current = null;

      if (!reattached && !changedTransport) return;

      reviveReconnect(reattached ? 'netinfo_reattached' : 'netinfo_transport_change');
    });

    return unsubscribe;
  }, [armOfflineFailOpen, clearOfflineFailOpen, reviveReconnect]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (prevRoomAppState.current === 'background' && next === 'active') {
        reviveReconnect('app_foreground');
      }

      // Only real states are recorded, so the iOS transients (notification
      // shade, app switcher, permission prompts) neither revive the budget nor
      // mask a later resume.
      if (next === 'active' || next === 'background') {
        prevRoomAppState.current = next;
        setAppState(next);
      }
    });

    return () => subscription.remove();
  }, [reviveReconnect]);

  // The bar has a single profile slot, so anything else raised meanwhile takes
  // it over for good: assert and re-assert while the condition holds, unless
  // the user has dismissed the notice. One effect for both notices, in priority
  // order - two would ping-pong the slot whenever a stall ends in a give-up.
  useEffect(() => {
    if (reconnectNotice.current.room || reconnectNotice.current.fatal) {
      if (noticeDismissed || barProfile === 'mediaReconnectFailed') return;

      dispatch(setProfile({ profile: 'mediaReconnectFailed' }));

      return;
    }

    if (!reconnectingNotice) return;
    if (reconnectingDismissed || barProfile === 'mediaReconnecting') return;

    dispatch(setProfile({ profile: 'mediaReconnecting' }));
  }, [barProfile, noticeDismissed, reconnectingDismissed, reconnectingNotice, dispatch]);

  // Handle fatal errors emitted from other parts of the app (e.g. unrecoverable
  // audio publish timeouts) by forcing a LiveKit room reconnection. Gated by
  // the reconnectOnFatalFailures setting. Mobile has no DOM CustomEvent, so this
  // listens on the module EventEmitter instead of window.addEventListener.
  useEffect(() => {
    const handleFatalError = ({ error, source }) => {
      logger.error({
        logCode: 'livekit_fatal_error_reconnect',
        extraInfo: {
          errorMessage: error?.message,
          errorName: error?.name,
          source,
          reconnectOnFatalFailures,
        },
      }, `LiveKit: fatal error detected - ${error?.message}, reconnect=${reconnectOnFatalFailures}`);

      if (!reconnectOnFatalFailures) return;

      // Give up after too many rapid consecutive fatal reconnects, so a
      // persistently failing link can't loop forever.
      if (fatalReconnectAttempts.current >= MAX_FATAL_RECONNECT_ATTEMPTS) {
        logger.error({
          logCode: 'livekit_fatal_error_reconnect_exhausted',
          extraInfo: {
            attempts: fatalReconnectAttempts.current,
            source,
          },
        }, `LiveKit: fatal-error reconnect attempts exhausted (${fatalReconnectAttempts.current}), giving up`);
        notifyReconnectExhausted('fatal', {
          attempts: fatalReconnectAttempts.current,
          max: MAX_FATAL_RECONNECT_ATTEMPTS,
          source,
        });

        return;
      }

      // The only emitter of this event is the LiveKit audio bridge, so the
      // audio teardown follows whichever bridge carries audio.
      const result = forceRoomReconnect({ source: 'fatal_error', resetAudio: usingAudio });

      // A refused reconnect tore nothing down, so it must not cost a budget a
      // burst of errors would otherwise drain without a single teardown.
      if (result !== 'started') return;

      fatalReconnectAttempts.current += 1;
      // Reset the counter if no further fatal error arrives within the stability
      // window (i.e. the link recovered), so isolated blips don't accumulate.
      if (fatalReconnectResetTimer.current) clearTimeout(fatalReconnectResetTimer.current);
      fatalReconnectResetTimer.current = setTimeout(() => {
        fatalReconnectAttempts.current = 0;
        fatalReconnectResetTimer.current = null;
        clearReconnectNotice('fatal');
      }, FATAL_RECONNECT_STABLE_MS);
    };

    liveKitEvents.on(LK_FATAL_ERROR_EVENT, handleFatalError);

    return () => {
      liveKitEvents.off(LK_FATAL_ERROR_EVENT, handleFatalError);
    };
  }, [
    reconnectOnFatalFailures,
    usingAudio,
    forceRoomReconnect,
    notifyReconnectExhausted,
    clearReconnectNotice,
  ]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (fatalReconnectResetTimer.current) clearTimeout(fatalReconnectResetTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearOfflineFailOpen();
      reconnectPending.current = false;
    };
  }, [clearOfflineFailOpen]);

  useEffect(() => {
    return () => {
      disconnectLiveKitRoom({ final: true });
    };
  }, []);

  if (!shouldUseLiveKit) return children;

  return (
    // Pin token to the ref to avoid triggering a reconnect on token refreshes.
    <LiveKitRoom
      video={false}
      audio={false}
      connect={false}
      token={initialLiveKitToken.current}
      serverUrl={url}
      room={liveKitRoom}
      style={{ zIndex: 0, height: 'initial', width: 'initial' }}
    >
      <LiveKitObserver
        room={liveKitRoom}
        usingAudio={usingAudio}
        usingCamera={usingCamera}
        setReconnectingNotice={setReconnectingNotice}
      />
      {usingAudio && selectiveSubscriptionEnabled && <SelectiveSubscription />}
      {children}
    </LiveKitRoom>
  );
};

export default BBBLiveKitRoom;
