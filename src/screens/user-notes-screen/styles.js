import styled from 'styled-components/native';
import { IconButton } from 'react-native-paper';
import Colors from '../../constants/colors';

const ContainerScreen = styled.View`
  width: 100%;
  height: 100%;
`;

const ToggleActionsBarIconButton = ({
  onPress
}) => {
  return (
    <IconButton
      style={{
        position: 'absolute', right: 5, top: 5, margin: 0, zIndex: 1,
      }}
      icon="more"
      mode="contained"
      iconColor={Colors.white}
      containerColor={Colors.orange}
      size={14}
      onPress={onPress}
    />
  );
};

export default {
  ContainerScreen,
  ToggleActionsBarIconButton
};
