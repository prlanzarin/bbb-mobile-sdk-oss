import IconButtonComponent from '../icon-button';
import Colors from '../../constants/colors';

const RaiseHandButton = ({ isHandRaised, onPress }) => {
  return (
    <IconButtonComponent
      size={32}
      icon={isHandRaised
        ? 'hand-back-right-outline'
        : 'hand-back-right-off-outline'}
      iconColor={
        isHandRaised ? Colors.blueIconColor : Colors.lightGray300
      }
      containerColor={
        isHandRaised ? Colors.white : Colors.lightGray200
      }
      animated
      onPress={onPress}
    />
  );
};

export default { RaiseHandButton };
