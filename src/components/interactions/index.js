import React from 'react';
import { useDispatch } from 'react-redux';
import { useSubscription, useMutation } from '@apollo/client';
import { hideNotification, setProfile } from '../../store/redux/slices/wide-app/notification-bar';
import Queries from './queries';
import Styled from './styles';

const InteractionsControls = () => {
  const { data } = useSubscription(Queries.CURRENT_USER_SUBSCRIPTION);
  const currUser = data?.user_current[0].userId;
  const isHandRaised = data?.user_current[0].raiseHand;
  const [setRaiseHand] = useMutation(Queries.SET_RAISE_HAND);
  const dispatch = useDispatch();

  const setRaideHands = (raiseHand) => {
    setRaiseHand({
      variables: {
        userId: currUser,
        raiseHand: !raiseHand,
      },
    });
  };

  const onPressButton = () => {
    setRaideHands(isHandRaised);
    if (!isHandRaised) {
      dispatch(setProfile({ profile: 'handsUp' }));
      return;
    }
    dispatch(hideNotification());
  };

  return (
    <Styled.RaiseHandButton
      isHandRaised={isHandRaised}
      onPress={onPressButton}
    />
  );
};

export default InteractionsControls;
