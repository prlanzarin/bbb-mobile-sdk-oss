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
    away
    avatar
  }
}`;

export default USER_LIST_SUBSCRIPTION;
