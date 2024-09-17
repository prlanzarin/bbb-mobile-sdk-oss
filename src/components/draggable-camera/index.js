import DraggableView from 'react-native-draggable-reanimated';
import { useSelector } from 'react-redux';
import { View } from 'react-native';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import Styled from './styles';

const DraggableCamera = () => {
  const { data: currentUserData } = useCurrentUser();
  const currentUserStreamId = currentUserData?.user_current[0]?.cameras[0]?.streamId;
  const mediaStreamId = useSelector((state) => state.screenshare.screenshareStream);

  if (!currentUserStreamId) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
    }}
    >

      <DraggableView
        initValue={{ x: 42, y: 42 }}
      >
        <View style={{
          width: 90,
          height: 160,
        }}
        >
          <Styled.ScreenshareStream streamURL={currentUserStreamId} />
        </View>
      </DraggableView>
    </View>
  );
};

export default DraggableCamera;
