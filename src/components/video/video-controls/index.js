import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useMutation } from '@apollo/client';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  selectLockSettingsProp,
  selectMetadata,
} from '../../../store/redux/slices/meeting';
import { isLocked } from '../../../store/redux/slices/current-user';
import { selectLocalVideoStreams } from '../../../store/redux/slices/video-streams';
import { isClientReady } from '../../../store/redux/slices/wide-app/client';
import useAppState from '../../../hooks/use-app-state';
import useDebounce from '../../../hooks/use-debounce';
import VideoManager from '../../../services/webrtc/video-manager';
import logger from '../../../services/logger';
import Queries from './queries';
import Styled from './styles';

const VideoControls = () => {
  const isConnected = useSelector((state) => state.video.isConnected);
  const isConnecting = useSelector((state) => state.video.isConnecting);
  const localCameraId = useSelector((state) => state.video.localCameraId);
  const camDisabled = useSelector((state) => selectLockSettingsProp(state, 'disableCam') && isLocked(state));
  const userRequestedHangup = useSelector((state) => state.video.userRequestedHangup);
  const localVideoStreams = useSelector(selectLocalVideoStreams);
  const ready = useSelector((state) => isClientReady(state) && state.video.signalingTransportOpen);
  const mediaServer = useSelector((state) => selectMetadata(state, 'media-server-video'));
  const recordingAdapter = useSelector((state) => selectMetadata(state, 'sfu-recording-adapter'));
  const [publishOnActive, setPublishOnActive] = useState(false);
  const [cameraBroadcastStart] = useMutation(Queries.CAMERA_BROADCAST_START);
  const [cameraBroadcastStop] = useMutation(Queries.CAMERA_BROADCAST_STOP);
  const appState = useAppState();
  const { t } = useTranslation();

  const isActive = isConnected || isConnecting;

  const sendUserShareWebcam = (cameraId) => {
    return cameraBroadcastStart({ variables: { cameraId } });
  };

  const sendUserStopWebcam = (cameraId) => {
    return cameraBroadcastStop({ variables: { cameraId } });
  };

  const fireDisabledCamAlert = () => {
    Alert.alert(
      t('mobileSdk.webcam.blockedLabel'),
      t('mobileSdk.permission.moderator'),
      null,
      { cancelable: true },
    );
  };

  const onButtonPress = useDebounce(() => {
    if (!camDisabled) {
      if (isActive) {
        VideoManager.unpublish(localCameraId);
      } else {
        publishCamera();
      }
    } else {
      fireDisabledCamAlert();
    }
  }, 1000);

  const publishCamera = () => {
    VideoManager.publish({ mediaServer, recordingAdapter }).catch((error) => {
      logger.error({
        logCode: 'video_publish_failure',
        extraInfo: {
          errorCode: error.code,
          errorMessage: error.message,
        }
      }, `Video published failed: ${error.message} - ${error.name}`);

      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
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
            onPress: () => publishCamera(),
          },
        ];

        Alert.alert(
          t('mobileSdk.webcam.blockedLabel'),
          t('mobileSdk.webcam.permissionLabel'),
          buttons,
          { cancelable: true },
        );
      }
    });
  };

  useEffect(() => {
    if (localCameraId) {
      sendUserShareWebcam(localCameraId);
    }
  }, [localCameraId]);

  useEffect(() => {
    if (userRequestedHangup && localCameraId) {
      sendUserStopWebcam(localCameraId);
    }
  }, [userRequestedHangup]);

  useEffect(() => {
    if (appState.match(/inactive|background/) && isActive) {
      // Only schedule a re-share if the camera was connected in the first place.
      // If it's still connecting, just stop it.
      setPublishOnActive(isConnected);
      VideoManager.unpublish(localCameraId);
    } else if (appState === 'active' && publishOnActive) {
      if (!camDisabled) {
        publishCamera();
        setPublishOnActive(false);
      } else {
        fireDisabledCamAlert();
      }
    }
  }, [appState]);

  useEffect(() => {
    // Remote camera stream is present and local stream is absent, but user
    // hasn't really requested a hangup - we need to reconnect
    if (ready
      && localVideoStreams.length >= 1
      && isActive === false
      && userRequestedHangup === false) {
      localVideoStreams.forEach(({ stream }) => {
        if (stream === localCameraId) return;
        VideoManager.stopVideo(stream);
      });

      if (!camDisabled && localCameraId == null) {
        publishCamera();
      } else {
        fireDisabledCamAlert();
      }
    }
  }, [userRequestedHangup, localVideoStreams, isConnected, localCameraId, ready]);

  return (
    <Styled.VideoButton
      isActive={isActive}
      onPress={onButtonPress}
      isConnecting={isConnecting}
    />
  );
};

export default VideoControls;
