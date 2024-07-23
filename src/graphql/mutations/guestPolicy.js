import { gql } from '@apollo/client';

const SET_POLICY = gql`
  mutation SetPolicy($guestPolicy: String!) {
    guestUsersSetPolicy(guestPolicy: $guestPolicy)
  }
`;

const SUBMIT_APPROVAL_STATUS = gql`
  mutation SubmitApprovalStatus($guests: [GuestUserApprovalStatus]!) {
    guestUsersSubmitApprovalStatus(guests: $guests)
  }
`;

export {
  SET_POLICY,
  SUBMIT_APPROVAL_STATUS
};
