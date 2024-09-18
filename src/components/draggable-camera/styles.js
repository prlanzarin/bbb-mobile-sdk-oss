import { RTCView } from 'react-native-webrtc';
import styled from 'styled-components';
import Colors from '../../constants/colors';

const VideoStream = styled(RTCView)`
  width: 100%;
  height: 100%;
  background-color: ${Colors.contentLetterboxColor};
  border-radius: 20px;
  object-fit: cover;
`;

const Container = styled.View`
  position: absolute;
`;

export default {
  VideoStream,
  Container
};
