import { gql } from '@apollo/client';

const CHAT_MESSAGE_PUBLIC_SUB = gql`subscription {
    chat_message_public(limit: 20, order_by: {createdAt: desc}) {
      chatId
      chatEmphasizedText
      correlationId
      createdAt
      message
      messageId
      senderId
      senderName
      senderRole
    }
  }`;

const SEND_MESSAGE_MUTATION = gql`
mutation ChatSendMessage($chatId: String!, $chatMessageInMarkdownFormat: String!) {
  chatSendMessage(
    chatId: $chatId,
    chatMessageInMarkdownFormat: $chatMessageInMarkdownFormat
  )
}
`;

export default {
  CHAT_MESSAGE_PUBLIC_SUB,
  SEND_MESSAGE_MUTATION
};
