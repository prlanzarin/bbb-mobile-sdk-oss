import IconButtonComponent from '../icon-button';
import Colors from '../../constants/colors';

const RaiseHandButton = ({ isHandRaised, onPress }) => {
  return (
    <IconButtonComponent
      size={32}
      icon={isHandRaised
        ? 'hand-back-left-outline'
        : 'hand-back-left-off-outline'}
      iconColor={
        isHandRaised ? Colors.white : Colors.lightGray300
      }
      containerColor={
        isHandRaised ? Colors.blue : Colors.lightGray100
      }
      animated
      onPress={onPress}
    />
  );
};

export default { RaiseHandButton };
