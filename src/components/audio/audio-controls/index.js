import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { useMutation, useSubscription } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAudioJoin } from '../../../hooks/use-audio-join';
import AudioManager from '../../../services/webrtc/audio-manager';
import { selectLockSettingsProp } from '../../../store/redux/slices/meeting';
import { isLocked } from '../../../store/redux/slices/current-user';
import { setAudioError } from '../../../store/redux/slices/wide-app/audio';
import logger from '../../../services/logger';
import Queries from './queries';
import Styled from './styles';

const AudioControls = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { joinAudio } = useAudioJoin();
  const isConnected = useSelector((state) => state.audio.isConnected);
  const isConnecting = useSelector(({ audio }) => audio.isConnecting || audio.isReconnecting);
  const micDisabled = useSelector((state) => selectLockSettingsProp(state, 'disableMic') && isLocked(state));
  const isListenOnly = useSelector((state) => state.audio.isListenOnly);
  const audioError = useSelector((state) => state.audio.audioError);
  const isActive = isConnected || isConnecting;
  const { data: currentUserVoiceData } = useSubscription(Queries.USER_CURRENT_VOICE);
  const isMuted = currentUserVoiceData?.user_current[0]?.voice?.muted;
  const unmutedAndConnected = !isMuted && isConnected;

  const [userSetMuted] = useMutation(Queries.USER_SET_MUTED);

  useEffect(() => {
    if (audioError) {
      switch (audioError) {
        case 'NotAllowedError':
        case 'SecurityError': {
          // TODO localization, programmatically dismissable Dialog that is reusable
          const buttons = [
            {
              text: t('app.settings.main.cancel.label'),
              style: 'cancel'
            },
            {
              text: t('app.settings.main.label'),
              onPress: () => Linking.openSettings(),
            },
            {
              text: t('mobileSdk.error.tryAgain'),
              onPress: () => joinAudio(),
            },
          ];

          Alert.alert(
            t('mobileSdk.error.microphone.permissionDenied'),
            t('mobileSdk.error.microphone.permissionLabel'),
            buttons,
            { cancelable: true },
          );
          break;
        }
        case 'ListenOnly':
          if (AudioManager.isListenOnly) {
            // TODO localization, programmatically dismissable Dialog that is reusable
            Alert.alert(
              t('mobileSdk.error.microphone.blocked'),
              t('app.audioNotificaion.reconnectingAsListenOnly'),
              null,
              { cancelable: true },
            );
          }
          break;
        default:
          // FIXME surface the rest of the errors via toast or chain a retry.
      }

      // Error is handled, clean it up
      dispatch(setAudioError(null));
    }
  }, [audioError]);

  const toggleVoice = async () => {
    const userId = currentUserVoiceData?.user_current[0]?.voice?.userId;
    const muted = !currentUserVoiceData?.user_current[0]?.voice?.muted;

    try {
      await userSetMuted({ variables: { muted, userId } });
    } catch (e) {
      logger.error('Error on trying to toggle muted');
    }
  };

  const onPressMic = () => {
    if (micDisabled) {
      // TODO localization, programmatically dismissable Dialog that is reusable
      Alert.alert(
        t('mobileSdk.error.microphone.blocked'),
        t('mobileSdk.permission.moderator'),
        null,
        { cancelable: true },
      );
      return;
    }
    toggleVoice();
  };

  const onPressHeadphone = () => {
    if (isActive) {
      AudioManager.exitAudio();
    } else {
      joinAudio();
    }
  };

  return (
    <Styled.AudioButtonComponent
      isConnected={isConnected}
      isConnecting={isConnecting}
      isListenOnly={isListenOnly}
      unmutedAndConnected={unmutedAndConnected}
      isActive={isActive}
      onPressJoined={onPressMic}
      onPressNotJoined={onPressHeadphone}
    />
  );
};

export default AudioControls;
