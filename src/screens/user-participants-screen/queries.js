import { gql } from '@apollo/client';

const USER_LIST_SUBSCRIPTION = gql`
subscription{
  user(limit: 100, offset: 0,
                order_by: [
                  {presenter: desc},
                  {role: asc},
                  {nameSortable: asc},
                  {userId: asc}
                ]) {
    name
    role
    color
    userId
    presenter
  }
}`;

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

export { USER_LIST_SUBSCRIPTION, SET_ROLE, SET_PRESENTER }
