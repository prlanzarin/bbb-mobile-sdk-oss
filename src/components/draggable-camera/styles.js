import { RTCView } from 'react-native-webrtc';
import styled from 'styled-components';
import Colors from '../../constants/colors';

const ScreenshareStream = styled(RTCView)`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: ${Colors.contentLetterboxColor};
  object-fit: cover;
`;

export default {
  ScreenshareStream
};
