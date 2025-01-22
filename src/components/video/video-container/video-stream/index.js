import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectMetadata } from '../../../../store/redux/slices/meeting';
import { isClientReady } from '../../../../store/redux/slices/wide-app/client';
import VideoManager from '../../../../services/webrtc/video-manager';
import Styled from './styles';

const SFUVideoStream = (props) => {
  const {
    cameraId,
    local,
    isGrid,
    renderPlaceholder,
  } = props;
  const mediaStreamId = useSelector((state) => state.video.videoStreams[cameraId]);
  const signalingTransportOpen = useSelector((state) => state.video.signalingTransportOpen);
  const mediaServer = useSelector((state) => selectMetadata(state, 'media-server-video'));
  const clientIsReady = useSelector(isClientReady);
  const visible = true;

  useEffect(() => {
    if (signalingTransportOpen && clientIsReady) {
      if (cameraId && !local) {
        if (!mediaStreamId && visible) {
          VideoManager.subscribe(cameraId, { mediaServer });
        }

        if (mediaStreamId && !visible) {
          VideoManager.unsubscribe(cameraId);
        }
      }
    }
  }, [clientIsReady, cameraId, mediaStreamId, signalingTransportOpen, visible]);

  if (cameraId && visible) {
    if (typeof mediaStreamId === 'string') {
      return (
        <Styled.VideoStream
          streamURL={mediaStreamId}
          isGrid={isGrid}
          objectFit="cover"
          zOrder={0}
        />
      );
    }
    return <Styled.VideoSkeleton />;
  }

  return renderPlaceholder();
};

export default SFUVideoStream;
