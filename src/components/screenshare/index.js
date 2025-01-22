import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSubscription } from '@apollo/client';
import { isClientReady } from '../../store/redux/slices/wide-app/client';
import { selectMetadata } from '../../store/redux/slices/meeting';
import ScreenshareManager from '../../services/webrtc/screenshare-manager';
import Styled from './styles';
import screenshareSubscription from '../../graphql/queries/screenshareSubscription';

const Screenshare = () => {
  const { data: screenshareData } = useSubscription(screenshareSubscription);
  const mediaStreamId = useSelector((state) => state.screenshare.screenshareStream);
  const isConnected = useSelector((state) => state.screenshare.isConnected);
  const clientIsReady = useSelector(isClientReady);
  const mediaServer = useSelector((state) => selectMetadata(state, 'media-server-screenshare'));

  const hasScreenshare = screenshareData?.screenshare.length > 0;

  useEffect(() => {
    if (clientIsReady && !mediaStreamId && hasScreenshare) {
      ScreenshareManager.subscribe({ mediaServer });
    }
  }, [clientIsReady, mediaStreamId, hasScreenshare]);

  if (isConnected && mediaStreamId) {
    return (
      <Styled.ScreenshareStream
        streamURL={mediaStreamId}
        zOrder={1}
      />
    );
  }

  return <Styled.ScreenshareSkeleton />;
};

export default Screenshare;
