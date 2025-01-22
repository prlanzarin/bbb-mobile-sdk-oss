import { gql } from '@apollo/client';

const USER_SET_TALKING = gql`
  mutation UserSetTalking($talking: Boolean!) {
    userSetTalking(
      talking: $talking
    )
  }
`;

export {
  USER_SET_TALKING,
};
