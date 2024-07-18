import { gql } from '@apollo/client';

const USER_CURRENT_SUBSCRIPTION = gql`subscription {
    user_current {
      userId
      authToken
      name
      loggedOut
      ejected
      isOnline
      isModerator
      joined
      joinErrorCode
      joinErrorMessage
      guestStatus
      guestStatusDetails {
        guestLobbyMessage
        positionInWaitingQueue
      }
      meeting {
          name
          ended
          learningDashboard {
            learningDashboardAccessToken
          }
      }
    }
  }`;

export default USER_CURRENT_SUBSCRIPTION;
