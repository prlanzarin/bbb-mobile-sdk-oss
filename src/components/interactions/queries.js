import { gql } from '@apollo/client';

const CURRENT_USER_SUBSCRIPTION = gql`
subscription User_current {
  user_current {
    raiseHand
    userId
  }
}`;

const SET_RAISE_HAND = gql`
  mutation UserSetRaiseHand($raiseHand: Boolean!, $userId: String) {
  userSetRaiseHand(raiseHand: $raiseHand, userId: $userId)
}
`;

export default {
  CURRENT_USER_SUBSCRIPTION, SET_RAISE_HAND
};
