import { gql } from '@apollo/client';

const SET_ROLE = gql`
mutation UserSetRole($userId: String!, $role: String!) {
  userSetRole(
    userId: $userId,
    role: $role
  )
}
`;

const SET_PRESENTER = gql`
mutation SetPresenter($userId: String!) {
  userSetPresenter(userId: $userId)
}
`;

export { SET_ROLE, SET_PRESENTER }
