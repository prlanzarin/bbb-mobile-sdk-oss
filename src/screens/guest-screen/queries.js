import { gql } from '@apollo/client';

const GUEST_STATUS_DETAILED_SUBSCRIPTION = gql`subscription {
    user_current {
      guestStatusDetails {
        guestLobbyMessage
        positionInWaitingQueue
      }
    }
  }`;

export default {
  GUEST_STATUS_DETAILED_SUBSCRIPTION
};
