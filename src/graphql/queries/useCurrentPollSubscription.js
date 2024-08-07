import { gql } from '@apollo/client';

const POLL_ACTIVE_SUBSCRIPTION = gql`
  subscription PollActive {
    poll (where: {published: {_eq: false}, ended: {_eq: false}}, order_by: [{ publishedAt: desc }], limit: 1) {
      ended
      published
      pollId
      type
      questionText
      multipleResponses
      secret
      userCurrent {
        responded
      }
      options {
        optionDesc
        optionId
        pollId
      }
      responses {
        optionId
        optionDesc
        optionResponsesCount
        pollResponsesCount
        questionText
      }
    }
  }
`;

export default POLL_ACTIVE_SUBSCRIPTION;
