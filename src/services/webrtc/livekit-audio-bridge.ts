import {
  AudioPresets,
  Track,
  ConnectionState,
  RoomEvent,
  ParticipantEvent,
  type DisconnectReason,
  type TrackPublication,
  type LocalTrack,
  type LocalTrackPublication,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
  type TrackPublishOptions,
} from 'livekit-client';
import {
  liveKitRoom,
  liveKitEvents,
  waitForRoomConnection,
  LK_FATAL_ERROR_EVENT,
} from '../livekit';
import MediaStreamUtils from './media-stream-utils';
import { consumeMuteCommand } from './mute-intent';
import { getMeetingSettings } from '../../graphql/local-states/useMeetingSettings';

const BRIDGE_NAME = 'livekit';
const SENDRECV_ROLE = 'sendrecv';
const DEFAULT_UNPUBLISH_AFTER_MUTE_MS = 5000;
// Window, counted from the moment the room settles out of a reconnect, during
// which the bridge still ignores the server's mute state: the mute the SFU
// derives from the reconnect's unpublish can trail the settle by more than ten
// seconds on a mobile link.
const RECONNECT_SERVER_MUTE_WINDOW_MS = 15000;
// Ceiling on how long an unsettled reconnect may hold the server's mute state,
// so a room that never comes back cannot hold it for the bridge's lifetime. Set
// above the connection-stall detector's own budget so it only bites where that
// detector has already given up on the room.
const RECONNECT_MUTE_HOLD_CEILING_MS = 90000;
// Time given to the reconnect's republish to land before the bridge reads the
// server's mute state again and reconciles against it.
const STATE_RECONCILE_DELAY_MS = 2000;

type ReconnectMuteHoldReason = 'reconnecting' | 'reconnect_settling';

interface JoinOptions {
  inputStream: MediaStream;
  muted: boolean;
  isListenOnly?: boolean;
}

interface SetInputStreamOptions {
  deviceId?: string | null;
  force?: boolean;
}

export default class LiveKitAudioBridge {
  public readonly bridgeName: string;

  public readonly clientSessionNumber: number;

  public _inputDeviceId: string | null;

  private readonly liveKitRoom: Room;

  private readonly role: string;

  private readonly userId: string;

  private readonly logger: any;

  private originalStream: MediaStream | null;

  // Set when the fallback publish lets livekit-client acquire the capture:
  // the shared Room runs with stopLocalTrackOnUnpublish disabled, so the
  // bridge is the only owner left to release that native capture.
  private bridgeAcquiredStream: boolean;

  private unpublishRequest: ReturnType<typeof setTimeout> | null;

  // Tracks whether a publish operation is pending. Used for idempotency checks
  // since LiveKit's actual state is not immediate.
  private isPublishPending: boolean;

  // Generation counter for publish operations. Prevents stale finally()
  // callbacks from clearing isPublishPending when a newer publish superseded them.
  private publishGeneration: number;

  // Set synchronously by stop() and never reset (stop() is terminal per
  // instance): used to abort a publish that was parked waiting for a usable
  // room while the bridge was being torn down.
  private stopping: boolean;

  // Desired mute state, mirroring the last mute/unmute intent applied via
  // setSenderTrackEnabled.
  private shouldBeMuted: boolean;

  // Last known authoritative mute state: server-originated, or the join intent
  // at joinAudio.
  private lastServerMuteState: boolean;

  private reconnectingSince: number | null;

  // When the room last settled out of a reconnect.
  private reconnectSettledAt: number | null;

  // The baseline the settle reconcile measures the server's state against: a
  // mute that reached shouldBeMuted before the hold took effect makes
  // shouldBeMuted itself useless as a reference.
  private preReconnectIntent: boolean | null;

  // Start of the outage the hold covers. Separate from reconnectingSince, which
  // is rewritten on every connection-state flap: re-arming the ceiling there
  // would let an outage that keeps flapping push it out indefinitely.
  private reconnectHoldSince: number | null;

  // Set when the reconnect in flight actually republished the microphone. Only
  // a full reconnect tears the publication down, and only that republish (plus
  // the unpublish the SFU reads as a mute) can leave a publication muted
  // without the server having decided to mute the user. A signal resume
  // republishes nothing, so a mute seen there is the server's and must stand.
  private reconnectRepublished: boolean;

  private serverStateReconcile: ReturnType<typeof setTimeout> | null;

  // Set for the duration of joinAudio: the publication is still being
  // established, so reconciling it against the last intent would race the join.
  private joinInFlight: boolean;

  // Recorded from the join options because a listen-only join still acquires a
  // real microphone stream here, so neither the input stream nor the mute
  // intent can tell a listen-only session apart from a muted sendrecv one.
  private listenOnly: boolean;

  constructor({
    userId,
    logger,
    clientSessionNumber,
  }) {
    this.role = SENDRECV_ROLE;
    this.bridgeName = BRIDGE_NAME;
    this.logger = logger;
    this.userId = userId;
    this.clientSessionNumber = clientSessionNumber;
    this.originalStream = null;
    this.bridgeAcquiredStream = false;
    this.liveKitRoom = liveKitRoom;
    this.unpublishRequest = null;
    this.isPublishPending = false;
    this.publishGeneration = 0;
    this.stopping = false;
    this.joinInFlight = false;
    this.listenOnly = false;
    // eslint-disable-next-line no-underscore-dangle
    this._inputDeviceId = null;

    this.onended = this.onended.bind(this);
    this.handleTrackSubscribed = this.handleTrackSubscribed.bind(this);
    this.handleTrackUnsubscribed = this.handleTrackUnsubscribed.bind(this);
    this.handleTrackSubscriptionFailed = this.handleTrackSubscriptionFailed.bind(this);
    this.handleLocalTrackMuted = this.handleLocalTrackMuted.bind(this);
    this.handleLocalTrackUnmuted = this.handleLocalTrackUnmuted.bind(this);
    this.handleLocalTrackPublished = this.handleLocalTrackPublished.bind(this);
    this.handleLocalTrackUnpublished = this.handleLocalTrackUnpublished.bind(this);
    this.handleRoomReconnected = this.handleRoomReconnected.bind(this);
    this.handleRoomReconnecting = this.handleRoomReconnecting.bind(this);
    this.handleRoomConnected = this.handleRoomConnected.bind(this);
    this.shouldBeMuted = true;
    this.lastServerMuteState = true;
    this.reconnectingSince = null;
    this.reconnectSettledAt = null;
    this.preReconnectIntent = null;
    this.reconnectHoldSince = null;
    this.reconnectRepublished = false;
    this.serverStateReconcile = null;

    this.observeLiveKitEvents();
  }

  set inputDeviceId(deviceId: string | null) {
    // eslint-disable-next-line no-underscore-dangle
    this._inputDeviceId = deviceId;
  }

  get inputDeviceId(): string | null {
    // eslint-disable-next-line no-underscore-dangle
    return this._inputDeviceId;
  }

  get publicationTrackStream(): MediaStream | null {
    const micTrackPublications = this.getLocalMicTrackPubs();
    const publication = micTrackPublications[0];

    return publication?.track?.mediaStream || null;
  }

  get inputStream(): MediaStream | null {
    return this.originalStream || this.publicationTrackStream;
  }

  private getLocalMicTrackPubs(): LocalTrackPublication[] {
    return Array.from(
      this.liveKitRoom.localParticipant.audioTrackPublications.values(),
    ).filter((publication) => publication.source === Track.Source.Microphone);
  }

  // Overriden by AudioManager
  private onstart(): void {
    this.logger.debug({
      logCode: 'livekit_audio_started',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
      },
    }, 'LiveKit: audio started');
  }

  // Overriden by AudioManager
  private onended(): void {
    this.logger.debug({
      logCode: 'livekit_audio_ended',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
      },
    }, 'LiveKit: audio ended');
  }

  // Overriden by AudioManager
  private onpublished(): void {
    this.logger.debug({
      logCode: 'livekit_audio_published',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
      },
    }, 'LiveKit: audio published');
  }

  // Overriden by AudioManager. Signals a mute-state change applied to the track
  // out-of-band (i.e. not via setSenderTrackEnabled, which already syncs Redux),
  // so the store can be reconciled with the real track state.
  private onmutestatechanged(muted: boolean): void {
    this.logger.debug({
      logCode: 'livekit_audio_mute_state_changed',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        muted,
      },
    }, `LiveKit: mute state changed - ${muted}`);
  }

  private static isMicrophonePublication(publication: TrackPublication): boolean {
    const { source } = publication;

    return source === Track.Source.Microphone;
  }

  private static isMicrophoneTrack(track?: LocalTrack | RemoteTrack): boolean {
    if (!track) return false;

    const { source } = track;

    return source === Track.Source.Microphone;
  }

  private static isFatalPublishError(error: Error): boolean {
    return error.name === 'ConnectionError'
      && error.message?.includes('timed out');
  }

  // Liveness is read off the audio tracks because MediaStream.active is a
  // constant true under @livekit/react-native-webrtc, the app's only
  // MediaStream implementation. Mirrors AudioManager._mediaFactory, which
  // already gates stream reuse on the same predicate.
  // Scope: under @livekit/react-native-webrtc a capture reads as ended only
  // when JS stops it (Room.disconnect()/LocalTrack.stop()) - the native ended
  // event is wired to video capture controllers only - so this detects a
  // stream the client tore down, never an OS-level device loss, which RN
  // still reports as live. Same caveat as canUnmuteInPlace.
  private static isStreamLive(stream: MediaStream | null): boolean {
    return !!stream && stream.getAudioTracks().some((track) => track.readyState === 'live');
  }

  // unmute() re-acquires a capture only for tracks the SDK created itself, so a
  // publication the bridge handed it has to be usable already - otherwise it
  // comes back enabled over a capture nobody can hear.
  // Under @livekit/react-native-webrtc a local capture only ever reads as ended
  // when JS stops it and never reports itself muted, so on mobile this only
  // rejects a publication with no track; it is kept for the day RN starts
  // surfacing device loss.
  private static canUnmuteInPlace(publication: LocalTrackPublication): boolean {
    const { track } = publication;

    if (!track) return false;
    if (!track.isUserProvided) return true;

    const capture = track.mediaStreamTrack;

    return capture?.readyState === 'live' && !capture.muted;
  }

  // A publish targets the room the bridge holds; if that room dies mid-publish
  // the caller must not wait on a promise the room can no longer complete. The
  // SDK already rejects in-flight publishes in engine.close()/cleanupClient()
  // before it emits RoomEvent.Disconnected, so this usually races an
  // already-settled promise: it is insurance against that ordering changing.
  private static bindToRoomLiveness<T>(room: Room, operation: Promise<T>): Promise<T> {
    if (room.state === ConnectionState.Disconnected) {
      // RN surfaces unhandled rejections in __DEV__ and the SDK call was already
      // issued, so adopt its rejection before abandoning it.
      operation.catch(() => {});

      return Promise.reject(new Error('Room disconnected before publishing'));
    }

    return new Promise<T>((resolve, reject) => {
      const onDisconnected = (reason?: DisconnectReason) => {
        reject(new Error(`Room disconnected while publishing (reason=${reason})`));
      };

      room.once(RoomEvent.Disconnected, onDisconnected);
      operation.then(resolve, reject).finally(() => {
        room.off(RoomEvent.Disconnected, onDisconnected);
      });
    });
  }

  private isLocalPublicationMuted(): boolean {
    const pubs = this.getLocalMicTrackPubs();

    return pubs.length === 0 || pubs.every((pub) => pub.isMuted);
  }

  private handleFatalPublishError(error: Error): void {
    this.logger.error({
      logCode: 'livekit_audio_fatal_publish_error_reconnect',
      extraInfo: {
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack,
        bridgeName: this.bridgeName,
        role: this.role,
        inputDeviceId: this.inputDeviceId,
        streamData: MediaStreamUtils.getMediaStreamLogData(this.inputStream),
      },
    }, 'LiveKit: fatal audio publish error detected, triggering reconnection');

    // Handled in components/livekit/index.js (BBBLiveKitRoom)
    liveKitEvents.emit(LK_FATAL_ERROR_EVENT, { error, source: 'audio' });
  }

  // Compares track identities rather than stream ones: publishing a
  // user-provided track makes the SDK wrap it in a brand new MediaStream, so
  // the published stream's id never matches the one handed to the bridge, while
  // the SDK's reconnect republish reuses the very same track - which is what
  // has to be detected here. Liveness comes from the track's readyState, as
  // in isStreamLive.
  private isTrackPublishedWithStream(stream: MediaStream | null): boolean {
    if (!stream) return false;

    const trackIds = stream.getAudioTracks().map((track) => track.id);

    if (trackIds.length === 0) return false;

    return this.getLocalMicTrackPubs().some((pub) => {
      const track = pub.track?.mediaStreamTrack;

      return !!track && trackIds.includes(track.id) && track.readyState === 'live';
    });
  }

  private clearUnpublishRequest(): void {
    if (this.unpublishRequest) {
      clearTimeout(this.unpublishRequest);
      this.unpublishRequest = null;
    }
  }

  private handleTrackSubscribed(
    // @ts-ignore - unused for now
    track: RemoteTrack,
    publication: RemoteTrackPublication,
  ): void {
    if (!LiveKitAudioBridge.isMicrophonePublication(publication)) return;

    const { trackSid, trackName } = publication;

    this.logger.debug({
      logCode: 'livekit_audio_subscribed',
      extraInfo: {
        bridgeName: this.bridgeName,
        trackSid,
        trackName,
        role: this.role,
      },
    }, `LiveKit: subscribed to microphone - ${trackSid}`);
  }

  private handleTrackUnsubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
  ): void {
    if (!LiveKitAudioBridge.isMicrophoneTrack(track)) return;

    const { trackSid, trackName } = publication;
    this.logger.debug({
      logCode: 'livekit_audio_unsubscribed',
      extraInfo: {
        bridgeName: this.bridgeName,
        trackSid,
        trackName,
        role: this.role,
      },
    }, `LiveKit: unsubscribed from microphone - ${trackSid}`);
  }

  private handleTrackSubscriptionFailed(trackSid: string): void {
    this.logger.error({
      logCode: 'livekit_audio_subscription_failed',
      extraInfo: {
        bridgeName: this.bridgeName,
        trackSid,
        role: this.role,
      },
    }, `LiveKit: failed to subscribe to microphone - ${trackSid}`);
  }

  private handleLocalTrackMuted(publication: TrackPublication): void {
    if (!LiveKitAudioBridge.isMicrophonePublication(publication)) return;

    const { trackSid, isMuted, trackName } = publication;

    this.logger.debug({
      logCode: 'livekit_audio_track_muted',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        trackSid,
        trackName,
        isMuted,
      },
    }, `LiveKit: audio track muted - ${trackSid}`);

    const lkAudioSettings = getMeetingSettings()?.public?.media?.livekit?.audio;
    const unpublishAfterMuteMs = lkAudioSettings?.unpublishAfterMuteMs
      ?? DEFAULT_UNPUBLISH_AFTER_MUTE_MS;

    if (lkAudioSettings?.unpublishOnMute && this.hasMicrophoneTrack()) {
      this.clearUnpublishRequest();

      this.unpublishRequest = setTimeout(() => {
        this.unpublishRequest = null;
        // The request is only armed while the publication is muted, so an
        // unmute in the meantime makes the unpublish unwanted.
        if (!this.hasMicrophoneTrack() || !this.isLocalPublicationMuted()) return;

        this.unpublish('after_mute').catch((error) => {
          this.logger.warn({
            logCode: 'livekit_audio_unpublish_after_mute_error',
            extraInfo: {
              errorMessage: (error as Error)?.message,
              errorName: (error as Error)?.name,
              bridgeName: this.bridgeName,
              role: this.role,
            },
          }, `LiveKit: unpublish after mute failed - ${(error as Error)?.message}`);
        });
      }, unpublishAfterMuteMs);
    }
  }

  private handleLocalTrackUnmuted(publication: TrackPublication): void {
    if (!LiveKitAudioBridge.isMicrophonePublication(publication)) return;

    const { trackSid, isMuted, trackName } = publication;

    this.clearUnpublishRequest();

    this.logger.debug({
      logCode: 'livekit_audio_track_unmuted',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        trackSid,
        trackName,
        isMuted,
      },
    }, `LiveKit: audio track unmuted - ${trackSid}`);

    // The server is not notified of a track-level unmute, so if BBB's state is
    // muted we must re-mute here to reconcile states.
    this.reinforceMuteState('local_track_unmuted');
  }

  private handleLocalTrackPublished(publication: LocalTrackPublication): void {
    if (!LiveKitAudioBridge.isMicrophonePublication(publication)) return;

    const { trackSid, trackName } = publication;

    this.logger.debug({
      logCode: 'livekit_audio_published',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        trackSid,
        trackName,
      },
    }, `LiveKit: audio track published - ${trackSid}`);

    if (this.reconnectingSince !== null) this.reconnectRepublished = true;

    // A (re)published track comes up unmuted (e.g. reconnect republish or a
    // fresh publish racing a mute). Reinforce the muted state if that is the
    // intent so audio never flows while the user is meant to be muted.
    this.reinforceMuteState('local_track_published');
  }

  private handleLocalTrackUnpublished(publication: LocalTrackPublication): void {
    if (!LiveKitAudioBridge.isMicrophonePublication(publication)) return;

    const { trackSid, trackName } = publication;

    this.logger.debug({
      logCode: 'livekit_audio_unpublished',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        trackSid,
        trackName,
      },
    }, `LiveKit: audio track unpublished - ${trackSid}`);
  }

  private handleRoomReconnecting(): void {
    this.reconnectingSince = Date.now();
    this.reconnectSettledAt = null;
    // Kept across a failed resume (Reconnecting -> Disconnected -> Connected):
    // the intent to reconcile against is the one the outage started from, not
    // the one the intervening reconnect attempt left behind.
    if (this.preReconnectIntent === null) {
      this.preReconnectIntent = this.shouldBeMuted;
      this.reconnectHoldSince = Date.now();
    }
    this.reconnectRepublished = false;
    this.clearServerStateReconcile();
    // A full reconnect recreates the PeerConnections, so a pending unpublish
    // would target a sender the new connection never created.
    this.clearUnpublishRequest();
  }

  private handleRoomReconnected(): void {
    // A signal-only resume also surfaces as Reconnected, and it republishes
    // nothing for the SFU to read as a mute.
    const fullReconnect = this.reconnectingSince !== null
      || this.preReconnectIntent !== null;

    this.reconnectingSince = null;
    if (fullReconnect) this.reconnectSettledAt = Date.now();
    this.scheduleServerStateReconcile();
    // A full reconnect republishes local tracks using the SDK's local mute
    // state, which may have drifted from BBB's authoritative state. Reinforce.
    this.reinforceMuteState('room_reconnected');
    this.reconcileMicPublication('room_reconnected');
  }

  private handleRoomConnected(): void {
    // A failed resume comes back as Reconnecting -> Disconnected -> Connected
    // and this bridge survives it, so the reconnect bookkeeping has to be taken
    // down here too - otherwise it stays armed for the bridge's lifetime.
    // The settle tail is only opened when a reconnect preceded this connect: a
    // first connect has no republish for the SFU to read as a mute.
    if (this.preReconnectIntent !== null) this.reconnectSettledAt = Date.now();
    this.reconnectingSince = null;
    this.scheduleServerStateReconcile();
    this.reconcileMicPublication('room_connected');
  }

  // A full reconnect unpublishes the microphone before republishing it, and the
  // server reads that unpublish as a mute - so a reconnect started while
  // unmuted would end with the user silenced. Server-originated mutes are held
  // for as long as the reconnect runs, plus a tail after it settles, so the
  // pre-reconnect intent survives the republish instead: on a mobile link the
  // reconnect itself takes tens of seconds and the server's mute lands anywhere
  // in that span. A room that is Disconnected is not reconnecting and holds
  // nothing; the ceiling covers one that stays Reconnecting forever.
  private reconnectMuteHoldReason(): ReconnectMuteHoldReason | null {
    const now = Date.now();
    const state = this.liveKitRoom?.state;

    if (this.reconnectingSince !== null
      && (state === ConnectionState.Reconnecting
        || state === ConnectionState.SignalReconnecting)) {
      const holdSince = this.reconnectHoldSince ?? this.reconnectingSince;

      return now - holdSince < RECONNECT_MUTE_HOLD_CEILING_MS ? 'reconnecting' : null;
    }

    if (this.reconnectSettledAt !== null
      && now - this.reconnectSettledAt < RECONNECT_SERVER_MUTE_WINDOW_MS) {
      return 'reconnect_settling';
    }

    return null;
  }

  private clearServerStateReconcile(): void {
    if (this.serverStateReconcile) {
      clearTimeout(this.serverStateReconcile);
      this.serverStateReconcile = null;
    }
  }

  // Nothing re-delivers a voice state the bridge ignored during a reconnect, so
  // the server's state is read once more when the room settles and adopted if
  // the two still disagree.
  private scheduleServerStateReconcile(): void {
    this.clearServerStateReconcile();

    this.serverStateReconcile = setTimeout(() => {
      // Measured against the pre-reconnect intent, not the live one: a mute the
      // hold did not cover has already overwritten shouldBeMuted, and comparing
      // against it would call the corrupted state agreement.
      const baselineIntent = this.preReconnectIntent ?? this.shouldBeMuted;

      if (this.lastServerMuteState === baselineIntent) {
        this.serverStateReconcile = null;
        this.reconnectRepublished = false;
        this.preReconnectIntent = null;
        this.reconnectHoldSince = null;

        return;
      }

      this.logger.warn({
        logCode: 'livekit_audio_mute_state_reconciled',
        extraInfo: {
          bridgeName: this.bridgeName,
          role: this.role,
          shouldBeMuted: this.shouldBeMuted,
          lastServerMuteState: this.lastServerMuteState,
          preReconnectIntent: this.preReconnectIntent,
        },
      }, 'LiveKit: adopting the server voice state after a reconnect');

      this.shouldBeMuted = this.lastServerMuteState;
      // The adoption has to reach Redux even when the track is already in the
      // adopted state and reinforceMuteState returns early: nothing else
      // re-delivers a voice state that was ignored. Mute direction only, per
      // reinforceMuteState's rule.
      if (this.shouldBeMuted) this.onmutestatechanged(true);
      // Cleared only after the reinforce: reconnectRepublished is what
      // authorizes reinforceMuteState to open the mic.
      this.reinforceMuteState('server_state_reconcile');
      this.serverStateReconcile = null;
      this.reconnectRepublished = false;
      this.preReconnectIntent = null;
      this.reconnectHoldSince = null;
    }, STATE_RECONCILE_DELAY_MS);
  }

  // The room can come back after an operation aimed at it already failed: a
  // reconnect cancels a pending publish, and a full disconnect leaves this
  // bridge alive with no publication while the connect effect skips the audio
  // re-join because audio.isConnected is still true. Nothing replays those, so
  // re-derive the publication from the last intent once the room is usable.
  private reconcileMicPublication(reason: string): void {
    if (this.stopping) return;
    if (this.listenOnly) return;
    if (this.shouldBeMuted || this.joinInFlight) return;
    if (!this.originalStream) return;
    if (this.hasMicrophoneTrack()) return;

    this.logger.info({
      logCode: 'livekit_audio_mic_reconciled',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        reason,
        inputDeviceId: this.inputDeviceId,
        streamData: MediaStreamUtils.getMediaStreamLogData(this.originalStream),
      },
    }, `LiveKit: republishing the microphone after room connect - ${reason}`);

    // Deliberately not forced: livekit-client parks a publish issued during a
    // reconnect instead of cancelling it and does not dedupe a re-wrapped raw
    // track, so superseding one here can leave two microphone publications of
    // which setMicrophoneEnabled(false) only mutes one.
    this.publish(this.originalStream).catch((error) => {
      this.logger.error({
        logCode: 'livekit_audio_mic_reconcile_error',
        extraInfo: {
          errorMessage: (error as Error)?.message,
          errorName: (error as Error)?.name,
          bridgeName: this.bridgeName,
          role: this.role,
          reason,
        },
      }, `LiveKit: failed to republish the microphone after room connect - ${(error as Error)?.message}`);
    });
  }

  // Re-assert the desired mute state onto the local microphone track:
  // reconnects/republishes and out-of-band track mutes/unmutes can leave the
  // track sending audio while BBB's state is muted, or silent while it is
  // unmuted.
  private reinforceMuteState(reason: string): void {
    if (!this.hasMicrophoneTrack()) return;

    const publicationMuted = this.isLocalPublicationMuted();

    if (this.shouldBeMuted === publicationMuted) return;

    const targetMuted = this.shouldBeMuted;
    const handleError = (error: Error) => {
      this.logger.error({
        logCode: 'livekit_audio_mute_reinforce_error',
        extraInfo: {
          errorMessage: error?.message,
          errorName: error?.name,
          errorStack: error?.stack,
          bridgeName: this.bridgeName,
          role: this.role,
          reason,
        },
      }, `LiveKit: failed to reinforce muted state - ${error?.message}`);
    };

    // The mic is only ever opened here while a reconnect that republished the
    // microphone is being reconciled. Outside that window, a publication muted
    // behind the bridge's back is the server's doing - lk-controller applies the
    // voice state onto the track and can beat the GraphQL verdict - and the
    // fail-safe direction is muted.
    if (!targetMuted
      && this.reconnectingSince === null
      && !this.reconnectRepublished) return;

    this.logger.warn({
      logCode: 'livekit_audio_mute_reinforced',
      extraInfo: {
        bridgeName: this.bridgeName,
        role: this.role,
        reason,
        shouldBeMuted: targetMuted,
        publicationMuted,
      },
    }, `LiveKit: reinforcing mute state on local audio track - ${reason}`);

    if (targetMuted) {
      this.liveKitRoom.localParticipant.setMicrophoneEnabled(false)
        .then(() => {
          // Only the mute direction is pushed into Redux: a reinforced unmute
          // is not acknowledged by the server yet, and syncing it would make
          // audio-controls' reconciliation push the stale server mute back down.
          this.onmutestatechanged(true);
        })
        .catch(handleError);
    } else {
      this.clearUnpublishRequest();
      // Publication-level unmute, for the reason spelled out on
      // reassertUnmuteIntent().
      this.getLocalMicTrackPubs()
        .filter((pub) => pub.isMuted)
        .forEach((pub) => { pub.unmute().catch(handleError); });
    }
  }

  private observeLiveKitEvents(): void {
    if (!this.liveKitRoom) return;

    this.removeLiveKitObservers();
    this.liveKitRoom.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed);
    this.liveKitRoom.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed);
    this.liveKitRoom.on(RoomEvent.TrackSubscriptionFailed, this.handleTrackSubscriptionFailed);
    this.liveKitRoom.localParticipant.on(ParticipantEvent.TrackMuted, this.handleLocalTrackMuted);
    this.liveKitRoom.localParticipant.on(ParticipantEvent.TrackUnmuted, this.handleLocalTrackUnmuted);
    this.liveKitRoom.localParticipant.on(ParticipantEvent.LocalTrackPublished, this.handleLocalTrackPublished);
    this.liveKitRoom.localParticipant.on(ParticipantEvent.LocalTrackUnpublished, this.handleLocalTrackUnpublished);
    this.liveKitRoom.on(RoomEvent.Connected, this.handleRoomConnected);
    this.liveKitRoom.on(RoomEvent.Reconnecting, this.handleRoomReconnecting);
    this.liveKitRoom.on(RoomEvent.Reconnected, this.handleRoomReconnected);
  }

  private removeLiveKitObservers(): void {
    if (!this.liveKitRoom) return;

    this.liveKitRoom.off(RoomEvent.TrackSubscribed, this.handleTrackSubscribed);
    this.liveKitRoom.off(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed);
    this.liveKitRoom.off(RoomEvent.TrackSubscriptionFailed, this.handleTrackSubscriptionFailed);
    this.liveKitRoom.localParticipant.off(ParticipantEvent.TrackMuted, this.handleLocalTrackMuted);
    this.liveKitRoom.localParticipant.off(ParticipantEvent.TrackUnmuted, this.handleLocalTrackUnmuted);
    this.liveKitRoom.localParticipant.off(ParticipantEvent.LocalTrackPublished, this.handleLocalTrackPublished);
    this.liveKitRoom.localParticipant.off(ParticipantEvent.LocalTrackUnpublished, this.handleLocalTrackUnpublished);
    this.liveKitRoom.off(RoomEvent.Connected, this.handleRoomConnected);
    this.liveKitRoom.off(RoomEvent.Reconnecting, this.handleRoomReconnecting);
    this.liveKitRoom.off(RoomEvent.Reconnected, this.handleRoomReconnected);
  }

  setSenderTrackEnabled(shouldEnable: boolean): boolean {
    // Record the latest mute intent so reconnect/republish/out-of-band track
    // unmutes can be reconciled against it (see reinforceMuteState).
    const previousIntent = this.shouldBeMuted;
    this.shouldBeMuted = !shouldEnable;
    this.lastServerMuteState = this.shouldBeMuted;
    const clientInitiated = previousIntent !== this.shouldBeMuted
      && consumeMuteCommand(this.shouldBeMuted);
    const trackPubs = this.getLocalMicTrackPubs();
    const isCurrentlyMuted = this.isLocalPublicationMuted();
    const hasPublishedTrack = this.hasMicrophoneTrack();
    const handleMuteError = (error: Error) => {
      this.logger.error({
        logCode: 'livekit_audio_set_sender_track_error',
        extraInfo: {
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
          bridgeName: this.bridgeName,
          role: this.role,
          enabled: shouldEnable,
        },
      }, `LiveKit: setSenderTrackEnabled failed - ${error.message}`);
    };

    this.logger.debug({
      logCode: 'livekit_audio_set_sender_track_enabled',
      extraInfo: {
        shouldEnable,
        bridgeName: this.bridgeName,
        role: this.role,
        isCurrentlyMuted,
        hasPublishedTrack,
        isPublishPending: this.isPublishPending,
      },
    }, `LiveKit: setSenderTrackEnabled(${shouldEnable}) muted=${isCurrentlyMuted} published=${hasPublishedTrack}`);

    if (shouldEnable) {
      // Already published and unmuted - nothing changed
      if (hasPublishedTrack && !isCurrentlyMuted) return false;

      // Cancel any pending unpublish request since we're unmuting
      this.clearUnpublishRequest();

      const trackName = `${this.userId}-audio-${this.inputDeviceId ?? 'default'}`;
      const currentPubs = trackPubs.filter((pub) => pub.trackName === trackName);

      // Track is published (matching device) - unmute it in place only where
      // that will carry audio again, otherwise fall through and re-acquire.
      const resumablePubs = currentPubs.filter(
        (pub) => LiveKitAudioBridge.canUnmuteInPlace(pub),
      );

      if (resumablePubs.length > 0) {
        const mutedPubs = resumablePubs.filter((pub) => pub.isMuted);

        if (mutedPubs.length > 0) {
          mutedPubs.forEach((pub) => pub.unmute());
          this.logger.debug({
            logCode: 'livekit_audio_track_unmute',
            extraInfo: {
              bridgeName: this.bridgeName,
              role: this.role,
              trackName,
            },
          }, `LiveKit: unmuting audio track - ${trackName}`);
          return true;
        }

        // Published, matching device, already unmuted - no-op
        this.logger.debug({
          logCode: 'livekit_audio_track_unmute_noop',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            trackName,
          },
        }, 'LiveKit: audio track unmute no-op');
        return false;
      }

      // Either nothing is published (unpublished on a previous mute toggle) or
      // this device's publication cannot carry audio again. Publish either way:
      // publish() drops a stale publication first and its dead-capture fallback
      // re-acquires.
      if (this.originalStream && (trackPubs.length === 0 || currentPubs.length > 0)) {
        if (currentPubs.length > 0) {
          // Sentinel for a publication that is present but cannot carry audio,
          // which mobile cannot produce today - see canUnmuteInPlace.
          this.logger.warn({
            logCode: 'livekit_audio_track_unmute_stale_pub',
            extraInfo: {
              bridgeName: this.bridgeName,
              role: this.role,
              trackName,
              currentPubs: currentPubs.length,
            },
          }, `LiveKit: publication cannot carry audio, republishing - ${trackName}`);
        }

        this.publish(this.originalStream).catch(handleMuteError);
        this.logger.debug({
          logCode: 'livekit_audio_track_unmute_publish',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            trackName,
          },
        }, `LiveKit: audio track unmute+publish - ${trackName}`);
        return true;
      }

      this.logger.debug({
        logCode: 'livekit_audio_track_unmute_noop',
        extraInfo: {
          bridgeName: this.bridgeName,
          role: this.role,
          trackName,
          hasPublishedTrack,
          isCurrentlyMuted,
        },
      }, 'LiveKit: audio track unmute no-op - no matching pubs or no original stream');
      return false;
    }

    // shouldEnable === false (mute)
    const holdReason: ReconnectMuteHoldReason | null = clientInitiated
      ? null
      : this.reconnectMuteHoldReason();

    if (holdReason) {
      // Hold the pre-reconnect intent. lastServerMuteState is deliberately kept
      // at the ignored value so the reconcile can tell that a mute was asked
      // for and never applied.
      this.shouldBeMuted = previousIntent;
      this.clearUnpublishRequest();
      // The reconcile armed at the settle may already have run, and nothing
      // re-delivers what is held here, so the hold arms its own settle read.
      if (holdReason === 'reconnect_settling') this.scheduleServerStateReconcile();
      this.logger.warn({
        logCode: 'livekit_audio_mute_ignored_reconnecting',
        extraInfo: {
          bridgeName: this.bridgeName,
          role: this.role,
          inputDeviceId: this.inputDeviceId,
          previousIntent,
          preReconnectIntent: this.preReconnectIntent,
          holdReason,
        },
      }, 'LiveKit: mute ignored while the room reconnects');

      return false;
    }

    if (isCurrentlyMuted || !hasPublishedTrack) return false;

    // Track is published and unmuted - mute it. The handleLocalTrackMuted
    // callback handles the (optional) debounced unpublish.
    this.liveKitRoom.localParticipant.setMicrophoneEnabled(false).catch(handleMuteError);

    return true;
  }

  // The bridge's own mute intent. A server mute held for the reconnect window
  // leaves it untouched, so callers must mirror this rather than what they asked
  // for.
  getMuteIntent(): boolean {
    return this.shouldBeMuted;
  }

  private hasMicrophoneTrack(): boolean {
    const tracks = this.getLocalMicTrackPubs();

    return tracks.length > 0;
  }

  // A publication the bridge did not issue itself - the SDK's reconnect
  // republish - carries the LocalTrack's own muted state, and nothing re-fires
  // setSenderTrackEnabled once Redux and the server already agree on "unmuted",
  // so the intent has to be pushed back onto the track. Unmuting the
  // publication rather than setMicrophoneEnabled(true), which can fall through
  // to acquiring a fresh capture when the publication is gone.
  private reassertUnmuteIntent(): void {
    if (this.shouldBeMuted || !this.isLocalPublicationMuted()) return;

    this.getLocalMicTrackPubs()
      .filter((pub) => pub.isMuted)
      .forEach((pub) => {
        pub.unmute().catch((error) => {
          this.logger.warn({
            logCode: 'livekit_audio_publish_reassert_error',
            extraInfo: {
              errorMessage: (error as Error).message,
              bridgeName: this.bridgeName,
              role: this.role,
            },
          }, 'LiveKit: failed to re-assert the unmute intent after a publish skip');
        });
      });
  }

  private async publish(inputStream: MediaStream | null, force = false): Promise<void> {
    // If the stream is already published and active, skip
    if (inputStream && this.isTrackPublishedWithStream(inputStream)) {
      this.logger.debug({
        logCode: 'livekit_audio_publish_idempotent_skip',
        extraInfo: {
          bridgeName: this.bridgeName,
          role: this.role,
          inputDeviceId: this.inputDeviceId,
          streamData: MediaStreamUtils.getMediaStreamLogData(inputStream),
        },
      }, 'LiveKit: stream already published, skipping publish');

      return;
    }

    // If a publish is already pending and this isn't a forced supersede, skip.
    // Prevents multiple publish operations from being queued when calls arrive
    // faster than LiveKit can process them.
    if (this.isPublishPending && !force) {
      this.logger.debug({
        logCode: 'livekit_audio_publish_pending_skip',
        extraInfo: {
          bridgeName: this.bridgeName,
          role: this.role,
          inputDeviceId: this.inputDeviceId,
        },
      }, 'LiveKit: publish already pending, skipping');

      return;
    }

    // The generation counter prevents stale finally() callbacks from clearing
    // isPublishPending when a newer publish has superseded them.
    this.publishGeneration += 1;
    const currentGeneration = this.publishGeneration;
    this.isPublishPending = true;

    try {
      // The room may still be (re)establishing when this runs (unmute during a
      // blip, republish after a resume). Wait for a room that can carry media
      // before touching the existing publication; with the Disconnected abort
      // in waitForRoomConnection, a terminal room fails fast instead of stalling.
      await waitForRoomConnection(this.liveKitRoom);

      // The bridge may have been stopped (stop()/exitAudio) or superseded by a
      // newer publish while the room was unusable. Publishing now would put a
      // live mic into the shared room on behalf of a dead bridge, with its
      // observers already detached, so reinforceMuteState could not re-mute it.
      if (this.stopping || this.publishGeneration !== currentGeneration) return;

      // The wait also ends on Reconnected, and the SDK republishes local tracks
      // before emitting it (republishAllTracks in its Room.ts), so the stream
      // handed to this publish may already be back on the wire. Unpublishing it
      // below would tear down the SDK's own republication and the server would
      // read that as a mute.
      if (inputStream && this.isTrackPublishedWithStream(inputStream)) {
        this.logger.debug({
          logCode: 'livekit_audio_publish_republished_skip',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            inputDeviceId: this.inputDeviceId,
            streamData: MediaStreamUtils.getMediaStreamLogData(inputStream),
          },
        }, 'LiveKit: stream republished while waiting for the room, skipping publish');

        this.reassertUnmuteIntent();

        return;
      }

      // @ts-ignore
      const basePublishOptions: TrackPublishOptions = {
        audioPreset: AudioPresets.music,
        dtx: false,
        red: true,
        forceStereo: false,
      };
      const publishOptions = {
        ...basePublishOptions,
        source: Track.Source.Microphone,
        name: `${this.userId}-audio-${this.inputDeviceId ?? 'default'}`,
      };
      const constraints = {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      };

      if (this.hasMicrophoneTrack()) await this.unpublish('republish');

      if (inputStream && !LiveKitAudioBridge.isStreamLive(inputStream)) {
        this.logger.warn({
          logCode: 'livekit_audio_publish_inactive_stream',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            inputDeviceId: this.inputDeviceId,
            streamData: MediaStreamUtils.getMediaStreamLogData(inputStream),
          },
        }, 'LiveKit: audio stream is inactive, fallback');
      }

      if (inputStream && LiveKitAudioBridge.isStreamLive(inputStream)) {
        // Get tracks from the stream and publish them. Map into an array of
        // Promise objects and wait for all of them to resolve.
        this.logger.debug({
          logCode: 'livekit_audio_publish_with_stream',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            inputDeviceId: this.inputDeviceId,
            streamData: MediaStreamUtils.getMediaStreamLogData(inputStream),
          },
        }, 'LiveKit: publishing audio track with stream');
        const trackPublishers = inputStream.getTracks()
          .map((track) => {
            return this.liveKitRoom.localParticipant.publishTrack(track, publishOptions);
          });
        await LiveKitAudioBridge.bindToRoomLiveness(
          this.liveKitRoom,
          Promise.all(trackPublishers),
        );
      } else {
        // Flagged before the call because it can still land a capture after
        // this publish is aborted by the room liveness binding or superseded:
        // claiming ownership of a capture that never came costs nothing, while
        // missing one leaks it.
        this.bridgeAcquiredStream = true;
        await LiveKitAudioBridge.bindToRoomLiveness(
          this.liveKitRoom,
          this.liveKitRoom.localParticipant.setMicrophoneEnabled(
            true,
            constraints,
            publishOptions,
          ),
        );

        // The capture in this branch is the SDK's, so it has to be read off the
        // publication: inputStream would hand back the dead originalStream.
        // An absent publication stream is kept rather than assigned, since a
        // null originalStream disables the unmute republish path for good.
        if (this.publicationTrackStream) {
          this.originalStream = this.publicationTrackStream;
        } else {
          this.logger.warn({
            logCode: 'livekit_audio_publish_pub_stream_missing',
            extraInfo: {
              bridgeName: this.bridgeName,
              role: this.role,
              inputDeviceId: this.inputDeviceId,
              streamData: MediaStreamUtils.getMediaStreamLogData(this.originalStream),
            },
          }, 'LiveKit: published without a publication stream, keeping the previous capture');
        }

        this.logger.debug({
          logCode: 'livekit_audio_publish_without_stream',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
            inputDeviceId: this.inputDeviceId,
            streamData: MediaStreamUtils.getMediaStreamLogData(this.originalStream),
          },
        }, 'LiveKit: published audio track without stream');
      }

      // A newer publish owns the publication by now, so it is the one that gets
      // to report success upwards.
      if (this.publishGeneration === currentGeneration) this.onpublished();
    } catch (error) {
      const publishedAnyway = !!inputStream && this.isTrackPublishedWithStream(inputStream);

      this.logger.error({
        logCode: 'livekit_audio_publish_error',
        extraInfo: {
          errorMessage: (error as Error).message,
          errorName: (error as Error).name,
          errorStack: (error as Error).stack,
          bridgeName: this.bridgeName,
          role: this.role,
          inputDeviceId: this.inputDeviceId,
          streamData: MediaStreamUtils.getMediaStreamLogData(inputStream || this.originalStream),
          publishedAnyway,
          stale: this.publishGeneration !== currentGeneration,
        },
      }, 'LiveKit: failed to publish audio track');

      // A timeout on a stream that is published regardless is most likely a
      // duplicate publish racing the SDK's reconnect republish, not a bugged
      // room: reporting success keeps it from forcing a full room reconnect
      // through the fatal-error handling.
      if (publishedAnyway) {
        // The re-assert works off current state, and the return has to stand
        // regardless: the stream is on the wire, so failing the caller would be
        // wrong even when a newer publish has taken over.
        this.reassertUnmuteIntent();
        if (this.publishGeneration === currentGeneration) this.onpublished();

        return;
      }

      // A superseded publish rejecting says nothing about the room a newer
      // publish is now using, and the fatal path tears audio down room-wide
      // (exitAudio + disconnect) and spends a reconnect attempt.
      if (this.publishGeneration === currentGeneration
        && LiveKitAudioBridge.isFatalPublishError(error as Error)) {
        this.handleFatalPublishError(error as Error);
      }

      throw error;
    } finally {
      // Only clear pending if no newer publish superseded this one
      if (this.publishGeneration === currentGeneration) this.isPublishPending = false;
    }
  }

  private unpublish(
    reason = 'unspecified',
  ): Promise<void | (void | LocalTrackPublication | undefined)[]> {
    const micTrackPublications = this.getLocalMicTrackPubs();

    if (!micTrackPublications || micTrackPublications.length === 0) return Promise.resolve();

    const unpublishers = micTrackPublications.map((publication: LocalTrackPublication) => {
      if (publication?.track && publication?.source === Track.Source.Microphone) {
        return this.liveKitRoom.localParticipant.unpublishTrack(publication.track);
      }

      return Promise.resolve();
    });

    return Promise.all(unpublishers)
      .catch((error) => {
        this.logger.error({
          logCode: 'livekit_audio_unpublish_error',
          extraInfo: {
            errorMessage: (error as Error).message,
            errorName: (error as Error).name,
            errorStack: (error as Error).stack,
            bridgeName: this.bridgeName,
            role: this.role,
            reason,
          },
        }, 'LiveKit: failed to unpublish audio track');
      });
  }

  async joinAudio(
    options: JoinOptions,
  ): Promise<void> {
    const {
      muted,
      inputStream,
      isListenOnly,
    } = options;

    try {
      this.joinInFlight = true;
      await waitForRoomConnection(this.liveKitRoom);
      this.originalStream = inputStream;
      this.shouldBeMuted = muted;
      this.lastServerMuteState = muted;
      this.reconnectRepublished = false;
      this.reconnectSettledAt = null;
      this.preReconnectIntent = null;
      this.reconnectHoldSince = null;
      this.listenOnly = !!isListenOnly;

      if (!muted) await this.publish(inputStream);

      this.onstart();
    } catch (error) {
      this.logger.error({
        logCode: 'livekit_audio_init_error',
        extraInfo: {
          errorMessage: (error as Error).message,
          errorName: (error as Error).name,
          errorStack: (error as Error).stack,
          bridgeName: this.bridgeName,
          role: this.role,
          inputDeviceId: this.inputDeviceId,
          streamData: MediaStreamUtils.getMediaStreamLogData(inputStream || this.originalStream),
        },
      }, `LiveKit: activate audio failed: ${(error as Error).message}`);
      throw error;
    } finally {
      this.joinInFlight = false;
    }
  }

  stop(): Promise<boolean> {
    // Synchronously, before any await: stop()'s own awaits routinely span the
    // moment the room becomes usable again, and a publish parked in the room
    // connection wait must not republish a mic after the user left audio.
    this.stopping = true;

    return this.liveKitRoom.localParticipant.setMicrophoneEnabled(false)
      .then(() => this.unpublish('stop'))
      .then(() => {
        this.logger.info({
          logCode: 'livekit_audio_exit',
          extraInfo: {
            bridgeName: this.bridgeName,
            role: this.role,
          },
        }, 'LiveKit: audio exited');
        return true;
      })
      .catch((error) => {
        this.logger.error({
          logCode: 'livekit_audio_exit_error',
          extraInfo: {
            errorMessage: (error as Error).message,
            errorName: (error as Error).name,
            errorStack: (error as Error).stack,
            bridgeName: this.bridgeName,
            role: this.role,
          },
        }, 'LiveKit: exit audio failed');
        return false;
      })
      .finally(() => {
        this.removeLiveKitObservers();
        this.clearUnpublishRequest();
        this.clearServerStateReconcile();
        // On react-native-webrtc, track.stop() is a JS-only state flip; only
        // the platform-specific release() frees the native capture. Restricted
        // to captures this bridge acquired - AudioManager owns the others.
        if (this.bridgeAcquiredStream && this.originalStream) {
          const releasable = this.originalStream as unknown as { release?: () => void };

          if (typeof releasable.release === 'function') releasable.release();
        }
        this.bridgeAcquiredStream = false;
        this.originalStream = null;
        this.isPublishPending = false;
        this.publishGeneration += 1;
        this.onended();
      });
  }
}
