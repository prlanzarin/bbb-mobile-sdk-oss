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

const PUBLISHED_POLLS_SUBSCRIPTION = gql`
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

const ALL_POLLS_SUBSCRIPTION = gql`
  subscription PollResults {
    poll (order_by: [{ publishedAt: desc }], limit: 100) {
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
      responses_aggregate {
        aggregate {
          count
        }
      }
      users_aggregate {
        aggregate {
          count
        }
      }
      users {
        responded
        optionDescIds
        user {
          name
          userId
        }
      }
    }
  }
`;

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

const POLL_PUBLISH_RESULT = gql`
  mutation PollPublishResult($pollId: String!) {
    pollPublishResult(pollId: $pollId)
  }
`;

const POLL_CANCEL = gql`
  mutation PollCancel {
    pollCancel
  }
`;

const POLL_CREATE = gql`
  mutation PollCreate(
    $pollType: String!,
    $pollId: String!,
    $secretPoll: Boolean!,
    $question: String!,
    $isMultipleResponse: Boolean!,
    $answers: [String]!
  ) {
    pollCreate(
      pollType: $pollType,
      pollId: $pollId,
      secretPoll: $secretPoll,
      question: $question,
      isMultipleResponse: $isMultipleResponse,
      answers: $answers,
    )
  }
`;

export default {
  POLL_ACTIVE_SUBSCRIPTION,
  POLL_SUBMIT_TYPED_VOTE,
  POLL_SUBMIT_VOTE,
  POLL_CREATE,
  PUBLISHED_POLLS_SUBSCRIPTION,
  ALL_POLLS_SUBSCRIPTION,
  POLL_PUBLISH_RESULT,
  POLL_CANCEL
};
