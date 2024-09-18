import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setHasUnreadMessages, setBottomChatOpen } from '../../../store/redux/slices/wide-app/chat';
import Styled from './styles';

const ChatControls = () => {
  const chatStore = useSelector((state) => state.chat);
  const dispatch = useDispatch();

  return (
    <Styled.ChatButton
      onPress={() => {
        dispatch(setBottomChatOpen(true));
        dispatch(setHasUnreadMessages(false));
      }}
      hasUnreadMessages={chatStore.hasUnreadMessages}
      isBottomChatOpen={chatStore.isBottomChatOpen}
    />
  );
};

export default ChatControls;
