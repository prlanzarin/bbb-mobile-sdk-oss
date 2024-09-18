import styled from 'styled-components/native';
import { StyleSheet } from 'react-native';
import Colors from '../../../constants/colors';

const opacityStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  indicatorStyle: {
    backgroundColor: 'white',
  },
  handleStyle: {
  },
  backgroundStyle: {
    backgroundColor: 'black',
    opacity: 0.5,
  },
  style: {
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#06172A',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.blueActionsBar,
    padding: 8,
  },
  indicatorStyle: {
    backgroundColor: 'white',
  },
  handleStyle: {
    backgroundColor: Colors.blueActionsBar,
    borderTopStartRadius: 20,
    borderTopEndRadius: 20,
  },
  backgroundStyle: {
    backgroundColor: Colors.blueActionsBar,
  },
  style: {
  }
});

const ControlsContainer = styled.View`
  padding: 22px 8px 0 8px;
  gap: 12px;
`;

export default {
  styles,
  opacityStyles,
  ControlsContainer
};
