import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { joinAudio } from '../../../store/redux/slices/voice-users';
import { setAudioError } from '../../../store/redux/slices/wide-app/audio';
import AudioManager from '../../../services/webrtc/audio-manager';
import Styled from './styles';

const AudioButton = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isConnected = useSelector((state) => state.audio.isConnected);
  const isConnecting = useSelector(({ audio }) => audio.isConnecting || audio.isReconnecting);
  const isActive = isConnected || isConnecting;

  const joinMicrophone = () => {
    dispatch(joinAudio()).unwrap().then(() => {
      // If user joined as listen only, it means they are locked which is a soft
      // error that needs to be surfaced
      if (AudioManager.isListenOnly) dispatch(setAudioError('ListenOnly'));
    }).catch((error) => {
      dispatch(setAudioError(error.name));
    });
  };

  const onPressHeadphone = () => {
    if (isActive) {
      AudioManager.exitAudio();
    } else {
      joinMicrophone();
    }
  };

  return (
    <Styled.ContainerPressable
      rippleColor="rgba(0, 0, 0, .32)"
      onPress={onPressHeadphone}
    >
      <>
        <Styled.HeadphoneIconContainer isActive={isActive} />
        <Styled.HeadphoneText isActive={isActive}>
          {!isActive ? t('mobileSdk.audio.join') : t('app.audio.leaveAudio')}
        </Styled.HeadphoneText>
      </>
    </Styled.ContainerPressable>
  );
};

export default AudioButton;
