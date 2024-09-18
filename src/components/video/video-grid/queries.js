import { gql } from '@apollo/client';

const USER_LIST_SUBSCRIPTION = gql`
  subscription UserListSubscription{
    user(limit: 100, offset: 0,
                  order_by: [
                    {pinned: desc_nulls_last},
                    {
                      voice: {
                        lastFloorTime: desc_nulls_last
                      }
                    }
                  ]) {
      name
      role
      color
      userId
      presenter
      away
      avatar
      pinned
      locked
      loggedOut
      raiseHand
      reactionEmoji
      cameras {
        streamId
      }
      voice {
        lastFloorTime
        floor
      }
    }
  }
`;

export default {
  USER_LIST_SUBSCRIPTION,
};
