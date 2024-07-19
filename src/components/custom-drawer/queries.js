import { gql } from '@apollo/client';

const USER_CURRENT_SUBSCRIPTION = gql`subscription {
    user_current {
      name
      role
      color
      avatar
      presenter
    }
  }`;

export default { USER_CURRENT_SUBSCRIPTION };
