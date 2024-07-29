import { gql } from '@apollo/client';

const USER_CURRENT_RAISE_HAND_SUBSCRIPTION = gql`
  subscription userCurrentRaiseHand {
    user_current {
      raiseHand
    }
  }
`;

const SET_RAISE_HAND = gql`
  mutation UserSetRaiseHand($raiseHand: Boolean!, $userId: String) {
    userSetRaiseHand(raiseHand: $raiseHand, userId: $userId)
  }
`;

export default {
  USER_CURRENT_RAISE_HAND_SUBSCRIPTION, SET_RAISE_HAND
};
