import { gql } from '@apollo/client';

const USER_SET_MUTED = gql`
  mutation UserSetMuted($userId: String, $muted: Boolean!) {
    userSetMuted(
      userId: $userId,
      muted: $muted
    )
  }
`;

const USER_CURRENT_VOICE = gql`
  subscription UserCurrentVoice {
    user_current {
      voice {
        muted
        userId
      }
    }
  }
`;

const USER_CURRENT_VOICE_JOINED = gql`
  subscription UserVoiceJoined {
    user_voice {
      joined
    }
  }
`


export default { USER_SET_MUTED, USER_CURRENT_VOICE, USER_CURRENT_VOICE_JOINED };
