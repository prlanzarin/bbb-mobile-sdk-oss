import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Platform, Dimensions } from 'react-native';
import ScreenWrapper from '../../components/screen-wrapper';
import VideoGrid from '../../components/video/video-grid';
import MiniAudioPlayerIcon from '../../components/audio-player/mini-audio-player-icon';
import TalkingIndicator from '../../components/talking-indicator';
import useAppState from '../../hooks/use-app-state';
import PiPView from './pip-view';
import Styled from './styles';
import { setIsPiPEnabled } from '../../store/redux/slices/wide-app/layout';

const DEVICE_HEIGHT = parseInt(Dimensions.get('window').height, 10);
const DEVICE_WIDTH = parseInt(Dimensions.get('window').width, 10);

const MainConferenceScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const initialChatMsgsFetched = useSelector((state) => state.client.initialChatMsgsFetched);
  const isPiPEnabled = useSelector((state) => state.layout.isPiPEnabled);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const appState = useAppState();
  const isAndroid = Platform.OS === 'android';

  const isBackgrounded = appState === 'background';

  // this effect controls the PiP view
  useEffect(() => {
    if (appState === 'background') {
      navigation.closeDrawer();
    }
    if (appState === 'active') {
      dispatch(setIsPiPEnabled(false));
    }
  }, [appState]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      if (initialChatMsgsFetched) {
        setIsLoading(false);
      }
    }, [initialChatMsgsFetched])
  );

  /* view components */
  const renderGridLayout = () => {
    return (
      <ScreenWrapper>
        <Styled.ContainerView>
          <TalkingIndicator />
          <VideoGrid />
          <MiniAudioPlayerIcon />
        </Styled.ContainerView>
      </ScreenWrapper>
    );
  };

  const renderPiP = () => {
    return (
      <PiPView />
    );
  };

  if (isLoading) {
    return (
      <Styled.GridItemSkeletonLoading
        DEVICE_HEIGHT={DEVICE_HEIGHT - 60}
        DEVICE_WIDTH={DEVICE_WIDTH}
      />
    );
  }

  return isBackgrounded && isAndroid && isPiPEnabled ? renderPiP() : renderGridLayout();
};

export default MainConferenceScreen;
