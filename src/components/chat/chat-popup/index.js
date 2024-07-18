import { useState, useCallback } from 'react';
import { useSubscription } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { setBottomChatOpen, setHasShownInFastChat } from '../../../store/redux/slices/wide-app/chat';
import ChatPopupItem from './chat-popout-item';
import Queries from './queries';
import Styled from './styles';

const ChatPopupList = () => {
  const dispatch = useDispatch();

  const { data } = useSubscription(Queries.CHAT_MESSAGE_PUBLIC_SUB);
  const messages = data?.chat_message_public || [];

  const [showMessage, setShowMessage] = useState(false);
  const lastMessage = messages[0];
  const isBottomChatOpen = useSelector((state) => state.chat.isBottomChatOpen);

  useFocusEffect(
    useCallback(() => {
      if (lastMessage?.message
      && !isBottomChatOpen) {
        setShowMessage(true);
      }
      const timer = setTimeout(() => {
        setShowMessage(false);
        dispatch(setHasShownInFastChat(true));
      }, 3000);

      return () => clearTimeout(timer);
    }, [messages.length])
  );

  if (showMessage) {
    return (
      <Styled.Container>
        <ChatPopupItem
          userName={lastMessage?.author}
          userText={lastMessage?.message}
          onPress={() => {
            dispatch(setBottomChatOpen(true));
            setShowMessage(false);
            dispatch(setHasShownInFastChat(true));
          }}
        />
      </Styled.Container>
    );
  }

  return null;
};

export default ChatPopupList;
