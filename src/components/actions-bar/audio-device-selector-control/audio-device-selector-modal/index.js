import React, { useCallback, useState } from 'react';
import { Modal } from 'react-native-paper';
import * as Linking from 'expo-linking';
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
  const [androidBTPerm, setAndroidBTPerm] = useState(null);
  const [androidRefreshedDevices, setAndroidRefreshedDevices] = useState(false);

  const ANDROID_SDK_MIN_BTCONNECT = 31;

  const getAudioDevicesIOS = async () => {
    const audioDevicesIOS = await AudioModule.getAudioInputs();
    dispatch(setAudioDevices(audioDevicesIOS));
  };

  const checkBTPermissionAndroid = async () => {
    if (Platform.Version >= ANDROID_SDK_MIN_BTCONNECT) {
      const checkStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
      setAndroidBTPerm(checkStatus);
    }
  };

  const refreshDevicesAndroid = () => {
    InCallManager.stop({ media: 'video' });
    InCallManager.start({ media: 'video' });
  };

  const missingPermissionView = () => {
    if (Platform.OS !== 'android') {
      return null;
    }

    if (androidBTPerm === false) {
      return (
        <>
          <Styled.MissingPermission>{t('mobileSdk.audio.deviceSelector.btPermissionOff')}</Styled.MissingPermission>
          <Styled.SettingsButton
            onPress={() => {
              Linking.openSettings();
              dispatch(hide());
            }}
          >
            {t('app.settings.main.label')}
          </Styled.SettingsButton>
        </>
      );
    }
    return null;
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        getAudioDevicesIOS();
        return;
      }
      if (Platform.OS === 'android') {
        checkBTPermissionAndroid();
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
        <Styled.RefreshDevicesButton
          loading={androidRefreshedDevices}
          onPress={() => {
            setAndroidRefreshedDevices(true);
            setTimeout(() => setAndroidRefreshedDevices(false), 5000);
            refreshDevicesAndroid();
          }}
        />
        <Styled.ButtonContainer loading={androidRefreshedDevices}>
          <Styled.OptionsButton
            onPress={() => {
              InCallManager.chooseAudioRoute('EARPIECE');
              dispatch(hide());
            }}
            selected={selectedAudioDevice === 'EARPIECE'}
          >
            {t('mobileSdk.audio.deviceSelector.earpiece')}
          </Styled.OptionsButton>
          <Styled.OptionsButton
            onPress={() => {
              InCallManager.chooseAudioRoute('SPEAKER_PHONE');
              dispatch(hide());
            }}
            selected={selectedAudioDevice === 'SPEAKER_PHONE'}
          >
            {t('mobileSdk.audio.deviceSelector.speakerPhone')}
          </Styled.OptionsButton>
          {audioDevices.includes('BLUETOOTH') && (
          <Styled.OptionsButton
            onPress={() => {
              InCallManager.chooseAudioRoute('BLUETOOTH');
              dispatch(hide());
            }}
            selected={selectedAudioDevice === 'BLUETOOTH'}
          >
            {t('mobileSdk.audio.deviceSelector.bluetooth')}
          </Styled.OptionsButton>
          )}
          {audioDevices.includes('WIRED_HEADSET') && (
          <Styled.OptionsButton
            onPress={() => {
              InCallManager.chooseAudioRoute('WIRED_HEADSET');
              dispatch(hide());
            }}
            selected={selectedAudioDevice === 'WIRED_HEADSET'}
          >
            {t('mobileSdk.audio.deviceSelector.wiredHeadset')}
          </Styled.OptionsButton>
          )}
          {missingPermissionView()}
        </Styled.ButtonContainer>
      </Styled.Container>
    </Modal>
  );
};

export default AudioDeviceSelectorModal;
