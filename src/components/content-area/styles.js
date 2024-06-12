import styled from 'styled-components/native';
import { css } from 'styled-components';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableRipple } from 'react-native-paper';
import presentation from '../presentation';
import screenshare from '../screenshare';
import Colors from '../../constants/colors';
import Pressable from '../pressable';

const Presentation = styled(presentation)``;
const Screenshare = styled(screenshare)``;
const ContentAreaPressable = styled.View`
  height: 100%;
  width: 100%;
  border-color: #06172A;
  border-width: 2px;
  `;

const NameLabelContainer = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  background-color: #28282d99;
  padding: 5px;
  margin: 5px;
  border-radius: 4px;
`;

const NameLabel = styled.Text`
  color: ${Colors.white};
`;

const PressableButton = styled(Pressable).attrs(() => ({
  pressStyle: {
    opacity: 0.8,
  },
}))`
  ${() => css`
    background-color: #28282d99;
    margin: 5px;
    border-radius: 4px;
    position: absolute;
    right: 0;
  `}
`;

const IconContainerFullscreen = styled(TouchableRipple)`
  background-color: #28282d99;
  margin: 5px;
  padding: 8px;
  border-radius: 4px;
  position: absolute;
  right: 0px;
`;

const IconContainerPiP = styled(TouchableRipple)`
  background-color: #28282d99;
  margin: 5px;
  padding: 8px;
  border-radius: 4px;
  position: absolute;
  right: 35px;
`;

const FullscreenIcon = ({ onPress, isScreensharing }) => (
  <IconContainerFullscreen onPress={onPress}>
    <MaterialIcons name={isScreensharing ? 'fullscreen' : 'draw'} size={16} color="#FFFFFF" />
  </IconContainerFullscreen>
);

const PIPIcon = ({ onPress }) => (
  <IconContainerPiP onPress={onPress}>
    <MaterialIcons name="picture-in-picture" size={16} color="#FFFFFF" />
  </IconContainerPiP>
);

export default {
  Presentation,
  Screenshare,
  ContentAreaPressable,
  NameLabel,
  NameLabelContainer,
  PressableButton,
  FullscreenIcon,
  PIPIcon
};
