import { useEffect, useMemo, useRef } from 'react';
import { useLocalParticipant } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useDispatch, useSelector } from 'react-redux';
import useCurrentUser from '../../../graphql/hooks/useCurrentUser';
import useMeeting from '../../../graphql/hooks/useMeeting';
import logger from '../../../services/logger';
import { consumeExpectedStreamStop } from '../../../services/livekit/camera-state.ts';
import {
  setIsConnected,
  setLocalCameraId,
} from '../../../store/redux/slices/wide-app/video';

// A camera the user did not stop is announced from the server's camera rows rather
// than from a LiveKit event: the rows are what every other client renders from, and
// a track the SDK is republishing does not touch them.
const LiveKitCameraTeardownObserver = ({ setCameraNotice }) => {
  const { data: currentUserData, loading, error } = useCurrentUser();
  const { data: meetingData } = useMeeting();
  const { localParticipant } = useLocalParticipant();
  const localCameraId = useSelector((state) => state.video.localCameraId);
  const dispatch = useDispatch();

  const currentUser = currentUserData?.user_current[0];
  const camLocked = !!(meetingData?.meeting[0]?.lockSettings?.disableCam
    && (currentUser?.locked ?? false));
  // A pending subscription result is not the server saying there are no cameras:
  // defaulting to an empty list would announce a teardown on any remount.
  const rowKnown = !loading && !error && !!currentUser;
  const serverCameraIds = useMemo(
    () => (Array.isArray(currentUser?.cameras)
      ? new Set(currentUser.cameras.map((camera) => camera.streamId))
      : null),
    [currentUser?.cameras],
  );
  // The camera is published before the server is told about it, so a missing row
  // only means a teardown once that camera's row has actually been seen.
  const confirmedIdRef = useRef(null);

  useEffect(() => {
    if (!localCameraId) {
      confirmedIdRef.current = null;

      return;
    }

    if (!rowKnown || serverCameraIds == null) return;

    if (serverCameraIds.has(localCameraId)) {
      confirmedIdRef.current = localCameraId;

      return;
    }

    if (confirmedIdRef.current !== localCameraId) return;

    confirmedIdRef.current = null;

    if (consumeExpectedStreamStop(localCameraId)) return;

    logger.warn({
      logCode: 'livekit_camera_stopped_unexpectedly',
      extraInfo: { cameraId: localCameraId, camLocked },
    }, 'LiveKit: camera stopped without the user asking');

    // The room is configured not to stop a track on unpublish, so the capture has
    // to be stopped explicitly.
    const publications = Array.from(localParticipant?.videoTrackPublications?.values() ?? []);
    publications
      .filter((publication) => publication.source === Track.Source.Camera && publication.track)
      .forEach((publication) => {
        localParticipant.unpublishTrack(publication.track, true).catch((unpublishError) => {
          logger.error({
            logCode: 'livekit_camera_unpublish_error',
            extraInfo: {
              cameraId: publication.trackName,
              errorMessage: unpublishError?.message,
              errorStack: unpublishError?.stack,
            },
          }, `LiveKit: camera unpublish error ${unpublishError?.message}`);
        });
      });

    dispatch(setLocalCameraId(null));
    dispatch(setIsConnected(false));
    // Announced locally because mobile has no consumer for the server's
    // notifications, and queued through BBBLiveKitRoom because the bar has a
    // single slot it re-asserts the persistent media notices over.
    setCameraNotice(camLocked ? 'cameraStoppedByLock' : 'cameraStopped');
  }, [
    localCameraId,
    rowKnown,
    serverCameraIds,
    camLocked,
    localParticipant,
    setCameraNotice,
    dispatch,
  ]);

  return null;
};

export default LiveKitCameraTeardownObserver;
