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

export default {
  CHAT_MESSAGE_PUBLIC_SUB,
};
