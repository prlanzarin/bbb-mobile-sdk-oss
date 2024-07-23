import { gql } from '@apollo/client';

const POLL_SUBSCRIPTION = gql`
  subscription PollResults {
    poll (where: {published: {_eq: true}}, order_by: [{ publishedAt: desc }], limit: 100) {
      ended
      published
      publishedAt
      pollId
      type
      questionText
      multipleResponses
      secret
      responses {
        optionDesc
        optionId
        optionResponsesCount
        pollResponsesCount
      }
    }
  }
`;

export default {
  POLL_SUBSCRIPTION};
