import { gql } from '@apollo/client';

const GET_GUEST_WAITING_USERS_SUBSCRIPTION = gql`
  subscription getGuestWaitingUsers{
    user_guest(where: {isWaiting: {_eq: true}}) {
      userId
      user {
        color
        name
        role
      }
    }
  }
`;

// TODO: remove this when a global meeting subscription is added
const GET_POLICY = gql`
  subscription MeetingSubscription {
      meeting {
        usersPolicies {
          guestPolicy
        }
      }
  }
`;

export { GET_GUEST_WAITING_USERS_SUBSCRIPTION, GET_POLICY };
