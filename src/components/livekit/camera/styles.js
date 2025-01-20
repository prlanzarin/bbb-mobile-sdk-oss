import { VideoTrack } from '@livekit/react-native';
import { StyleSheet, View } from 'react-native';
import Colors from '../../../constants/colors';

const styles = StyleSheet.create({
  stream: {
    position: 'relative',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: Colors.contentLetterboxColor,
  },
  streamGrid: {
    position: 'relative',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: Colors.contentLetterboxColor,
  },
});

const LKCameraStream = ({ isGrid, trackRef }) => (
  <VideoTrack
    trackRef={trackRef}
    style={isGrid ? styles.streamGrid : styles.stream}
  />
);

const LKCameraSkeleton = () => (
  <View style={{ backgroundColor: Colors.contentLetterboxColor, height: '100%', width: '100%' }} />
);

export default {
  LKCameraStream,
  LKCameraSkeleton,
};
