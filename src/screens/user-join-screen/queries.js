import { gql } from '@apollo/client';

const USER_JOIN_MUTATION = gql`
mutation UserJoin($authToken: String!, $clientType: String!) {
  userJoinMeeting(
    authToken: $authToken,
    clientType: $clientType,
    clientIsMobile: $clientIsMobile,
  )
}
`;

export default { USER_JOIN_MUTATION };
