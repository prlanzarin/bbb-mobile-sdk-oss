import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import ScreenWrapper from '../../components/screen-wrapper';
import VideoGrid from '../../components/video/video-grid';
import MiniAudioPlayerIcon from '../../components/audio-player/mini-audio-player-icon';
import TalkingIndicator from '../../components/talking-indicator';
import useAppState from '../../hooks/use-app-state';
import PiPView from './pip-view';
import Styled from './styles';

const MainConferenceScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const initialChatMsgsFetched = useSelector((state) => state.client.initialChatMsgsFetched);
  const isPiPEnabled = useSelector((state) => state.layout.isPiPEnabled);
  const navigation = useNavigation();
  const appState = useAppState();
  const isAndroid = Platform.OS === 'android';

  const isBackgrounded = appState === 'background';

  // this effect controls the PiP view
  useEffect(() => {
    if (appState === 'background') {
      navigation.closeDrawer();
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
      <Styled.GridItemSkeletonLoading />
    );
  }

  return isBackgrounded && isAndroid && isPiPEnabled ? renderPiP() : renderGridLayout();
};

export default MainConferenceScreen;
