import { gql } from '@apollo/client';

const BREAKOUT_INVITE_SUBSCRIPTION = gql`
  subscription chatMessagePublicSubscription {
    breakoutRoom {
      joinURL
      shortName
      freeJoin
      assignedUsers {
        userId
      }
      breakoutRoomId
    }
  }
`;

export default { BREAKOUT_INVITE_SUBSCRIPTION };
