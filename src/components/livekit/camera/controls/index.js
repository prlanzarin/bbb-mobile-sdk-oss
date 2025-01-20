import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocalParticipant, RoomContext } from '@livekit/react-native';
import Styled from '../../../video/video-controls/styles';
import {
  setIsConnecting,
  setIsConnected,
  setLocalCameraId,
} from '../../../../store/redux/slices/wide-app/video';
import useDebounce from '../../../../hooks/use-debounce';
import VideoManager from '../../../../services/webrtc/video-manager';
import logger from '../../../../services/logger';
import { liveKitRoom } from '../../../../services/livekit';

const LKVideoControls = ({
  disabled,
  appState,
  isConnected,
  isConnecting,
  localCameraId,
  sendUserShareWebcam,
  sendUserStopWebcam,
  fireDisabledCamAlert,
  handleCameraPublishError,
}) => {
  const { localParticipant } = useLocalParticipant();
  const dispatch = useDispatch();
  const [publishOnActive, setPublishOnActive] = useState(false);
  const isActive = localParticipant.isCameraEnabled || isConnecting;
  const constraints = { video: true };

  const publishCamera = useCallback(async () => {
    const newCameraId = VideoManager.buildCameraId();
    const publishOptions = { dtx: true, videoCodec: 'vp8', name: newCameraId };

    if (localParticipant.isCameraEnabled) await unpublishCamera(localCameraId);

    dispatch(setIsConnecting(true));
    localParticipant.setCameraEnabled(true, constraints, publishOptions)
      .then(() => {
        dispatch(setLocalCameraId(newCameraId));
        dispatch(setIsConnected(true));
        sendUserShareWebcam(newCameraId);
      })
      .catch(handleCameraPublishError)
      .finally(() => {
        dispatch(setIsConnecting(false));
      });
  }, [handleCameraPublishError]);

  const unpublishCamera = async (cameraId) => {
    try {
      await localParticipant.setCameraEnabled(false);
      logger.info({
        logCode: 'livekit_camera_unpublished',
        extraInfo: { cameraId },
      }, 'LiveKit: Camera unpublished');
    } catch (error) {
      logger.error({
        logCode: 'livekit_camera_unpublish_error',
        extraInfo: {
          errorMessage: error.message,
          errorStack: error.stack,
        },
      }, `LiveKit: camera unpublish error ${error.message}`);
    } finally {
      sendUserStopWebcam(cameraId);
      dispatch(setLocalCameraId(null));
      dispatch(setIsConnected(false));
    }
  };

  const onButtonPress = useDebounce(useCallback(() => {
    if (!disabled) {
      if (isActive) {
        unpublishCamera(localCameraId);
      } else {
        publishCamera();
      }
    } else {
      fireDisabledCamAlert();
    }
  }, [disabled, isActive, localCameraId, publishCamera, unpublishCamera]), 1000);

  useEffect(() => {
    if (appState.match(/inactive|background/) && isActive) {
      // Only schedule a re-share if the camera was connected in the first place.
      // If it's still connecting, just stop it.
      setPublishOnActive(isConnected);
      unpublishCamera(localCameraId);
    } else if (appState === 'active' && publishOnActive) {
      if (!disabled) {
        publishCamera();
        setPublishOnActive(false);
      } else {
        fireDisabledCamAlert();
      }
    }
  }, [appState, unpublishCamera]);

  return (
    <Styled.VideoButton
      isActive={isActive}
      onPress={onButtonPress}
      isConnecting={isConnecting}
    />
  );
};

const LKVideoControlsContainer = (props) => {
  return (
    <RoomContext.Provider value={liveKitRoom}>
      <LKVideoControls {...props} />
    </RoomContext.Provider>
  );
};

export default LKVideoControlsContainer;
