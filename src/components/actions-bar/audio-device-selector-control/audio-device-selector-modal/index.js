import React, { useCallback } from 'react';
import { Modal } from 'react-native-paper';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { setAudioDevices } from '../../../../store/redux/slices/wide-app/audio';
import { hide } from '../../../../store/redux/slices/wide-app/modal';
import Styled from './styles';

const AudioDeviceSelectorModal = () => {
  const { AudioModule } = NativeModules;
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const audioDevices = useSelector((state) => state.audio.audioDevices);
  const selectedAudioDevice = useSelector((state) => state.audio.selectedAudioDevice);
  const modalCollection = useSelector((state) => state.modal);

  const ANDROID_SDK_MIN_BTCONNECT = 31;

  const checkBTPermissionAndroid = async () => {
    if (Platform.OS === 'android' && Platform.Version >= ANDROID_SDK_MIN_BTCONNECT) {
      const checkStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      return checkStatus;
    }
  };

  const getAudioDevicesIOS = async () => {
    const audioDevicesIOS = await AudioModule.getAudioInputs();
    dispatch(setAudioDevices(audioDevicesIOS));
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        getAudioDevicesIOS();
      }
    }, [modalCollection.isShow])
  );

  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={modalCollection.isShow}
        onDismiss={() => {
          dispatch(hide());
        }}
      >
        <Styled.Container>
          <Styled.DeviceSelectorTitle>{t('mobileSdk.audio.deviceSelector.title')}</Styled.DeviceSelectorTitle>
          <Styled.ButtonContainer>
            {audioDevices.map((ad) => {
              if (ad.type !== 'EARPIECE') {
                return (
                  <Styled.OptionsButton
                    onPress={() => {
                      AudioModule.setAudioDevice(ad.uid);
                      dispatch(hide());
                    }}
                    key={ad.uid}
                    selected={ad.selected}
                  >
                    {ad.name === 'Speaker'
                      ? t('mobileSdk.audio.deviceSelector.speakerPhone')
                      : ad.name}
                  </Styled.OptionsButton>
                );
              }
              return null;
            })}
          </Styled.ButtonContainer>
        </Styled.Container>
      </Modal>
    );
  }

  return (
    <Modal
      visible={modalCollection.isShow}
      onDismiss={() => dispatch(hide())}
    >
      <Styled.Container>
        <Styled.DeviceSelectorTitle>{t('mobileSdk.audio.deviceSelector.title')}</Styled.DeviceSelectorTitle>
        <Styled.ButtonContainer>
          <Styled.OptionsButton onPress={() => InCallManager.chooseAudioRoute('EARPIECE')} selected={selectedAudioDevice === 'EARPIECE'}>
            {t('mobileSdk.audio.deviceSelector.earpiece')}
          </Styled.OptionsButton>
          <Styled.OptionsButton onPress={() => InCallManager.chooseAudioRoute('SPEAKER_PHONE')} selected={selectedAudioDevice === 'SPEAKER_PHONE'}>
            {t('mobileSdk.audio.deviceSelector.speakerPhone')}
          </Styled.OptionsButton>
          {audioDevices.includes('BLUETOOTH') && (
          <Styled.OptionsButton onPress={() => InCallManager.chooseAudioRoute('BLUETOOTH')} selected={selectedAudioDevice === 'BLUETOOTH'}>
            {t('mobileSdk.audio.deviceSelector.bluetooth')}
          </Styled.OptionsButton>
          )}
          {audioDevices.includes('WIRED_HEADSET') && (
          <Styled.OptionsButton onPress={() => InCallManager.chooseAudioRoute('WIRED_HEADSET')} selected={selectedAudioDevice === 'WIRED_HEADSET'}>
            {t('mobileSdk.audio.deviceSelector.wiredHeadset')}
          </Styled.OptionsButton>
          )}
          {!checkBTPermissionAndroid && <Styled.MissingPermission>{t('mobileSdk.audio.deviceSelector.btPermissionOff')}</Styled.MissingPermission>}
        </Styled.ButtonContainer>
      </Styled.Container>

    </Modal>
  );
};

export default AudioDeviceSelectorModal;
