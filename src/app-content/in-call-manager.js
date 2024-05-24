import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InCallManager from 'react-native-incall-manager';
import { DeviceEventEmitter, Platform } from 'react-native';
import { setAudioDevices, setSelectedAudioDevice } from '../store/redux/slices/wide-app/audio';
import logger from '../services/logger';

const InCallManagerController = () => {
  const audioIsConnected = useSelector((state) => state.audio.isConnected);
  const dispatch = useDispatch();
  const nativeEventListeners = useRef([]);

  useEffect(() => {
    // InCallManager cannot get DeviceChange from iOS
    if (Platform.OS === 'ios') {
      return;
    }

    nativeEventListeners.current.push(
      DeviceEventEmitter.addListener('onAudioDeviceChanged', (event) => {
        const { availableAudioDeviceList, selectedAudioDevice } = event;
        logger.info({
          logCode: 'audio_devices_changed',
          extraInfo: {
            availableAudioDeviceList,
            selectedAudioDevice,
          },
        }, `Audio devices changed: selected=${selectedAudioDevice} available=${availableAudioDeviceList}`);
        dispatch(setAudioDevices(event.availableAudioDeviceList));
        dispatch(setSelectedAudioDevice(event.selectedAudioDevice));
      })
    );

    return () => {
      nativeEventListeners.current.forEach((eventListener) => eventListener.remove());
    };
  }, []);

  useEffect(() => {
    if (audioIsConnected) {
      InCallManager.start({ media: 'video' });
      return;
    }
    InCallManager.stop({ media: 'video' });
  }, [audioIsConnected]);

  return null;
};

export default InCallManagerController;
