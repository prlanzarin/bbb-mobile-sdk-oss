import { gql } from '@apollo/client';

// Add fields as needed
const MEETING_SUBSCRIPTION = gql`
  subscription MeetingSubscription {
      meeting {
        cameraBridge
        screenShareBridge
        audioBridge
      }
  }
`;
export default MEETING_SUBSCRIPTION;
