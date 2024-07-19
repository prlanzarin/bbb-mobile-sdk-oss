import { gql } from '@apollo/client';

const USER_CURRENT_SUBSCRIPTION = gql`subscription {
    user_current {
      name
      role
      color
      avatar
      presenter
      meeting {
        isBreakout
      }
    }
  }`;

export default { USER_CURRENT_SUBSCRIPTION };
