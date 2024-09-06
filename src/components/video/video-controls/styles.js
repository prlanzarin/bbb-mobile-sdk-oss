import styled from 'styled-components/native';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import IconButtonComponent from '../../icon-button';
import Colors from '../../../constants/colors';

const LoadingWrapper = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  alignItems: center;
  justifyContent: center;
`;

const VideoButton = ({ isActive, isConnecting, onPress }) => (
  <View>
    <IconButtonComponent
      onPress={onPress}
      size={32}
      icon={isActive ? 'video' : 'video-off'}
      iconColor={isActive ? Colors.white : Colors.lightGray300}
      containerColor={isActive ? Colors.blue : Colors.lightGray100}
      animated
    />
    <LoadingWrapper pointerEvents="none">
      <ActivityIndicator
        size={32 * 1.5}
        color={isActive ? Colors.white : Colors.lightGray300}
        animating={isConnecting}
        hidesWhenStopped
      />
    </LoadingWrapper>
  </View>
);

export default {
  VideoButton
};
