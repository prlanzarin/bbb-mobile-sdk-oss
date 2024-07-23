import { gql } from '@apollo/client';

const CREATE_SESSION = gql`
  mutation createSession($externalId: String!) {
    sharedNotesCreateSession(
      sharedNotesExtId: $externalId
    )
  }
`;

const PAD_SESSION_SUBSCRIPTION = gql`
subscription padSession {
  sharedNotes_session {
    sessionId
    sharedNotesExtId
    padId
    sharedNotes {
      padId
    }
  }
}
`;

export default {
  CREATE_SESSION,
  PAD_SESSION_SUBSCRIPTION
};
