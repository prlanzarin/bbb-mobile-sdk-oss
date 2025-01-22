import { Room } from 'livekit-client';

export const liveKitRoom = new Room({
  adaptiveStream: true,
  dynacast: true,
  stopLocalTrackOnUnpublish: false,
});

export default {
  liveKitRoom,
};
