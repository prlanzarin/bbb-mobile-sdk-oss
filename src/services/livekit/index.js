import { ConnectionState, Room, RoomEvent } from 'livekit-client';
import { EventEmitter2 } from 'eventemitter2';
import logger from '../logger';
import AudioManager from '../webrtc/audio-manager';
import VideoManager from '../webrtc/video-manager';
import ScreenshareManager from '../webrtc/screenshare-manager';
import { clearExpectedStreamStops, expectAllStreamStops } from './camera-state.ts';

// React Native has no DOM (window/CustomEvent), so cross-module LiveKit signals
// go through this emitter instead of window.dispatchEvent/addEventListener.
export const LK_FATAL_ERROR_EVENT = 'liveKitFatalError';
export const liveKitEvents = new EventEmitter2();

export const DEFAULT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  // A single peer connection carries subscriptions on trailing negotiations, which races
  // the audio subscriptions mobile drives by hand, so keep publisher and subscriber apart.
  singlePeerConnection: false,
  stopLocalTrackOnUnpublish: false,
};

// Only the keys mobile actually honours are taken from the meeting settings: a
// server-authored roomOptions is shaped for the web client, and shallow-merging one of
// its nested blocks (audioCaptureDefaults, publishDefaults) would replace the object the
// SDK already merged its own defaults into - dropping echo cancellation/AGC on every
// capture - while a JSON reconnectPolicy would replace a class instance.
const SUPPORTED_ROOM_OPTION_KEYS = [
  'adaptiveStream',
  'dynacast',
  'singlePeerConnection',
  'stopLocalTrackOnUnpublish',
];

/**
 * Layers the meeting's configured room options over the shipped defaults, so an
 * override that carries only some of the keys keeps ours for the rest.
 *
 * @param {Object} [configured]
 * @returns {Object}
 */
export const resolveRoomOptions = (configured) => {
  const picked = {};

  if (configured) {
    SUPPORTED_ROOM_OPTION_KEYS.forEach((key) => {
      if (configured[key] !== undefined) picked[key] = configured[key];
    });
  }

  return { ...DEFAULT_ROOM_OPTIONS, ...picked };
};

/**
 * Merges options into a room's own options object.
 *
 * livekit-client hands that object to LocalParticipant and RTCEngine by reference at
 * construction and keeps reading dynacast, stopLocalTrackOnUnpublish and publishDefaults
 * off it, so it must never be swapped for a new one.
 *
 * @param {import('livekit-client').Room | undefined} room
 * @param {Object} [options]
 */
export const applyRoomOptions = (room, options) => {
  if (room && options) Object.assign(room.options, options);
};

// The room is built at bootstrap, before the meeting settings are fetched, so there is
// nothing to read here yet: the configured options are merged in before connecting.
export const liveKitRoom = new Room(resolveRoomOptions());

/**
 * Whether a connection state is one the SDK is trying to recover from.
 *
 * @param {import('livekit-client').ConnectionState} state
 * @returns {boolean}
 */
export const isReconnectingState = (state) => state === ConnectionState.Reconnecting
  || state === ConnectionState.SignalReconnecting;

// A room reports Disconnected both before it has ever connected and after it has been
// torn down, and only the second is an interruption. This Room is a module global reused
// across breakout entry, leave and SDK re-mounts, so the flag is reset on a final
// teardown: otherwise the next session starts with an interruption already latched.
let connectedOnce = false;

// A single permanent listener: re-arming a `once` per teardown accumulates listeners on
// a Room that outlives every session.
liveKitRoom.on(RoomEvent.Connected, () => {
  connectedOnce = true;
  clearExpectedStreamStops();
});

/**
 * @returns {boolean} Whether the room has connected at least once this session.
 */
export const hasConnectedOnce = () => connectedOnce;

// How long a room may stay unusable before the caller gives up on it.
export const ROOM_CONNECTION_TIMEOUT = 15000;

/**
 * Resolves once `room` can carry media, rejects once it cannot.
 *
 * A fresh connect ends in Connected and an SDK resume in Reconnected, with the
 * state pinned at Reconnecting/SignalReconnecting in between, so both events
 * have to be watched or an operation fired mid-resume waits out the timeout
 * even though the session came back. Disconnected ends the wait whatever its
 * reason: the SDK only emits it after tearing the room down (publications and
 * participants cleared), and a resume never reaches that point, so neither
 * event can arrive afterwards and only a fresh connect revives the room.
 *
 * @param {import('livekit-client').Room | undefined} room
 * @param {number} [timeout]
 * @returns {Promise<void>}
 */
export const waitForRoomConnection = (room, timeout = ROOM_CONNECTION_TIMEOUT) => {
  return new Promise((resolve, reject) => {
    if (!room) {
      reject(new Error('LiveKit room not available'));

      return;
    }

    if (room.state === ConnectionState.Connected) {
      resolve();

      return;
    }

    const cleanup = () => {
      clearTimeout(timer);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Reconnected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Room connection timeout'));
    }, timeout);
    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onDisconnected = (reason) => {
      cleanup();
      reject(new Error(`Room disconnected while waiting for connection (reason=${reason})`));
    };

    room.once(RoomEvent.Connected, onConnected);
    room.once(RoomEvent.Reconnected, onConnected);
    room.once(RoomEvent.Disconnected, onDisconnected);
  });
};

export const disconnectLiveKitRoom = ({
  final = false,
}) => {
  if (final) {
    connectedOnce = false;
    // Every camera goes down with the session, and the teardown is not
    // something to warn the user about.
    expectAllStreamStops();
  }

  liveKitRoom.disconnect()
    .then(() => {
      logger.debug({
        logCode: 'livekit_room_destroyed',
      }, 'LiveKit room destroyed');
    })
    .catch((error) => {
      logger.error({
        logCode: 'livekit_disconnect_error',
        extraInfo: {
          errorCode: error.code,
          errorMessage: error.message,
        },
      }, `LiveKit disconnect error: ${error.message}`);
    })
    .finally(() => {
      if (final) {
        AudioManager.destroy();
        VideoManager.destroy();
        ScreenshareManager.destroy();
      }
    });
};

export default {
  disconnectLiveKitRoom,
  liveKitRoom,
  liveKitEvents,
  LK_FATAL_ERROR_EVENT,
};
