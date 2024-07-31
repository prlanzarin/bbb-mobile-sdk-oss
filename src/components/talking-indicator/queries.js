import { gql } from '@apollo/client';

const TALKING_INDICATOR_SUBSCRIPTION = gql`
  subscription talkingIndicatorSubscription {
    user_voice(
      where: { talking: { _eq: true } }
      order_by: [{ startTime: asc_nulls_last }]
      limit: 3
    ) {
      talking
      userId
      user {
        name
      }
    }
  }
`;

export default { TALKING_INDICATOR_SUBSCRIPTION };
