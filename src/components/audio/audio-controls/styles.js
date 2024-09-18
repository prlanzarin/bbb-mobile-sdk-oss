import styled from 'styled-components/native';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
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

const AudioButtonComponent = ({
  isConnected,
  isConnecting,
  isListenOnly,
  unmutedAndConnected,
  onPressJoined,
  isActive,
  onPressNotJoined
}) => {
  if (isConnected && !isListenOnly) {
    return (
      <IconButtonComponent
        size={32}
        icon={unmutedAndConnected ? 'microphone' : 'microphone-off'}
        iconColor={unmutedAndConnected ? Colors.white : Colors.lightGray300}
        containerColor={unmutedAndConnected ? Colors.blue : Colors.lightGray100}
        animated
        onPress={onPressJoined}
      />
    );
  }
  return (
    <View>
      <IconButtonComponent
        size={32}
        icon={isActive ? 'headphones' : 'headphones-off'}
        iconColor={isActive ? Colors.white : Colors.lightGray300}
        containerColor={isActive ? Colors.blue : Colors.lightGray100}
        loading={isConnecting}
        animated
        onPress={onPressNotJoined}
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
};

export default {
  LoadingWrapper,
  AudioButtonComponent
};
