import { ActivityIndicator } from 'react-native-paper';
import { VideoTrack } from '@livekit/react-native';
import { StyleSheet } from 'react-native';
import Colors from '../../../constants/colors';

const styles = StyleSheet.create({
  stream: {
    position: 'relative',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: Colors.contentLetterboxColor,
  },
});

const LKScreenshareSkeleton = () => (
  <ActivityIndicator
    size="large"
    color="white"
    backgroundColor={Colors.contentLetterboxColor}
    animating="true"
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  />
);

const LKScreenshareStream = ({ trackRef }) => (
  <VideoTrack
    trackRef={trackRef}
    style={styles.stream}
  />
);

export default { LKScreenshareSkeleton, LKScreenshareStream };
