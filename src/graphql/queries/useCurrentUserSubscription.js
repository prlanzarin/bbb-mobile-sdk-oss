import { gql } from '@apollo/client';

const USER_CURRENT_SUBSCRIPTION = gql`
  subscription userCurrentSubscription {
    user_current {
      userId
      authToken
      name
      role
      avatar
      color
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
          isBreakout
          learningDashboard {
            learningDashboardAccessToken
          }
      }
    }
  }
`;

export default USER_CURRENT_SUBSCRIPTION;
