import { gql } from '@apollo/client';

const CAMERA_BROADCAST_START = gql`
  mutation CameraBroadcastStart($cameraId: String!) {
    cameraBroadcastStart(
      stream: $cameraId
    )
  }
`;

const CAMERA_BROADCAST_STOP = gql`
  mutation CameraBroadcastStop($cameraId: String!) {
    cameraBroadcastStop(
      stream: $cameraId
    )
  }
`;

export default {
  CAMERA_BROADCAST_START,
  CAMERA_BROADCAST_STOP,
};
