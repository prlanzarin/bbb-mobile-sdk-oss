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
    }
  }
`;

const USER_CURRENT_SUBSCRIPTION = gql`subscription {
  user_current {
    role
    presenter
  }
}`;

const POLL_SUBMIT_TYPED_VOTE = gql`
  mutation PollSubmitTypedVote($pollId: String!, $answer: String!) {
    pollSubmitUserTypedVote(
      pollId: $pollId,
      answer: $answer,
    )
  }
`;

const POLL_SUBMIT_VOTE = gql`
  mutation PollSubmitVote($pollId: String!, $answerIds: [Int]!) {
    pollSubmitUserVote(
      pollId: $pollId,
      answerIds: $answerIds,
    )
  }
`;

export default {
  POLL_ACTIVE_SUBSCRIPTION,
  POLL_SUBMIT_TYPED_VOTE,
  POLL_SUBMIT_VOTE,
  USER_CURRENT_SUBSCRIPTION
};
