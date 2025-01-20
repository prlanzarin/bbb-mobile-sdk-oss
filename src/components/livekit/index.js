import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useSelector } from 'react-redux';
import {
  LiveKitRoom,
  useLocalParticipant,
  useIsSpeaking,
  useConnectionState,
} from '@livekit/react-native';
import {
  ConnectionState,
} from 'livekit-client';
import AudioManager from '../../services/webrtc/audio-manager';
import logger from '../../services/logger';
import useMeeting from '../../graphql/hooks/useMeeting';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import { liveKitRoom } from '../../services/livekit';
import { USER_SET_TALKING } from './mutations';

const LiveKitObserver = ({
  room,
  url,
  usingAudio,
}) => {
  const { localParticipant } = useLocalParticipant();
  const [setUserTalking] = useMutation(USER_SET_TALKING);
  const isSpeaking = useIsSpeaking(localParticipant);
  const connectionState = useConnectionState(room);
  const { data: currentUserData } = useCurrentUser();
  const joinedVoice = currentUserData?.user_current[0]?.voice?.joined ?? false;
  const isMuted = useSelector((state) => state.audio.isMuted);
  const isConnected = useSelector((state) => state.audio.isConnected);

  useEffect(() => {
    logger.debug({
      logCode: 'livekit_conn_state_changed',
      extraInfo: {
        connectionState,
        url,
      },
    }, `LiveKit conn state changed: ${connectionState}`);
  }, [connectionState]);

  useEffect(() => {
    if (!usingAudio) return;

    setUserTalking({
      variables: {
        talking: isSpeaking,
      },
    });
  }, [isSpeaking, isMuted]);

  useEffect(() => {
    if (!usingAudio) return;

    if (!isConnected
      && connectionState === ConnectionState.Connected
      && joinedVoice) {
      AudioManager.onAudioJoin();
    }
  }, [isConnected, connectionState, joinedVoice]);

  return null;
};

const BBBLiveKitRoom = ({ children }) => {
  const { data: currentUserData } = useCurrentUser();
  const host = useSelector((state) => state.client.meetingData.host);
  const url = `wss://${host}/livekit`;
  const livekitToken = currentUserData?.user_current[0]?.livekit?.livekitToken;
  const { data: meetingData } = useMeeting();
  const {
    cameraBridge,
    screenShareBridge,
    audioBridge,
  } = meetingData?.meeting[0] || {};
  const usingAudio = audioBridge === 'livekit';
  const shouldUseLiveKit = cameraBridge === 'livekit'
    || screenShareBridge === 'livekit'
    || usingAudio;

  if (!shouldUseLiveKit) {
    return children;
  }

  return (
    <LiveKitRoom
      video={false}
      audio={usingAudio}
      connect={shouldUseLiveKit}
      token={livekitToken}
      serverUrl={url}
      room={liveKitRoom}
      style={{ zIndex: 0, height: 'initial', width: 'initial' }}
    >
      <LiveKitObserver room={liveKitRoom} url={url} usingAudio={usingAudio} />
      {children}
    </LiveKitRoom>
  );
};

export default BBBLiveKitRoom;
