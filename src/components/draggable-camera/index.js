import DraggableView from 'react-native-draggable-reanimated';
import { useSelector } from 'react-redux';
import { View } from 'react-native';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import Styled from './styles';

const DraggableCamera = () => {
  const { data: currentUserData } = useCurrentUser();
  const currentUserCameraId = currentUserData?.user_current[0]?.cameras[0]?.streamId;
  const mediaStreamId = useSelector((state) => state.video.videoStreams[currentUserCameraId]);

  if (!mediaStreamId) {
    return null;
  }

  return (
    <Styled.Container>
      <DraggableView
        initValue={{ x: 42, y: 42 }}
      >
        <View style={{
          width: 90 * 1.25,
          height: 160 * 1.25,
          zIndex: 1200
        }}
        >
          <Styled.VideoStream streamURL={mediaStreamId} zOrder={2} />
        </View>
      </DraggableView>
    </Styled.Container>
  );
};

export default DraggableCamera;
