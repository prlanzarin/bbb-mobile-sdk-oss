import { gql } from '@apollo/client';

const SCREENSHARE_SUBSCRIPTION = gql`
  subscription Screenshare {
    screenshare {
      contentType
      hasAudio
      screenshareConf
      screenshareId
      startedAt
      stoppedAt
      stream
      vidHeight
      vidWidth
      voiceConf
    }
  }
`;

export default SCREENSHARE_SUBSCRIPTION;
