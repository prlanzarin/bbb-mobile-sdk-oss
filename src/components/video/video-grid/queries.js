import { gql } from '@apollo/client';

const USER_LIST_SUBSCRIPTION = gql`
subscription{
  user(limit: 100, offset: 0, 
                order_by: [
                  {presenter: desc},
                  {role: asc},
                  {raiseHandTime: asc_nulls_last},
                  {emojiTime: asc_nulls_last},
                  {isDialIn: desc},
                  {hasDrawPermissionOnCurrentPage: desc},
                  {nameSortable: asc},
                  {registeredAt: asc},
                  {userId: asc}
                ]) {
    name
    role
    color
    avatar
    raiseHand
    reactionEmoji
    avatar
    presenter
    pinned
    locked
    loggedOut
    cameras {
      streamId
    }
  }
}`;

export default { USER_LIST_SUBSCRIPTION };
