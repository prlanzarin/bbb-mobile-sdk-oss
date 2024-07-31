import { gql } from '@apollo/client';

const USER_LEAVE_MEETING = gql`
  mutation UserLeaveMeeting {
    userLeaveMeeting
  }
`;

export default {
  USER_LEAVE_MEETING
};
