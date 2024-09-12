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

export default { USER_SET_MUTED, USER_CURRENT_VOICE };
