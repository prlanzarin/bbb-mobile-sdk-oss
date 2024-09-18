import styled from 'styled-components/native';
import IconButton from '../../icon-button/index';
import Colors from '../../../constants/colors';

const NotificationIcon = styled(IconButton)`
  position: absolute;
  padding: 0px;
  margin: 0px;
  z-index: 1;
  height: 12px;
  width: 12px;
  right: 8px;
  top: 8px;
`;

const Container = styled.View`
  position: relative;
`;

const ChatButton = ({ onPress, hasUnreadMessages, isBottomChatOpen }) => {
  return (
    <Container>
      <IconButton
        size={32}
        icon="message-outline"
        iconColor={isBottomChatOpen ? Colors.blueIconColor : Colors.lightGray300}
        containerColor={isBottomChatOpen ? Colors.white : Colors.lightGray200}
        animated
        onPress={onPress}
      />
      {hasUnreadMessages && (
        <NotificationIcon
          icon="circle"
          size={12}
          iconColor={Colors.orange}
        />
      )}
    </Container>
  );
};

export default {
  NotificationIcon,
  Container,
  ChatButton,
};
