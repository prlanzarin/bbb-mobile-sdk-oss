import { useMutation } from '@apollo/client';
import { Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import Queries from './queries';
import { setInitialCurrentUser } from '../../store/redux/slices/wide-app/client';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';

const UserJoinScreen = () => {
  const navigation = useNavigation();
  const [dispatchUserJoin] = useMutation(Queries.USER_JOIN_MUTATION);
  const { data, loading, error } = useCurrentUser();
  const currentUser = data?.user_current[0];
  const dispatch = useDispatch();

  const handleDispatchUserJoin = (authToken) => {
    dispatchUserJoin({
      variables: {
        authToken,
        clientType: 'HTML5',
        clientIsMobile: true,
      },
    });
  };

  useEffect(() => {
    if (currentUser) {
      handleDispatchUserJoin(currentUser.authToken);
      dispatch(setInitialCurrentUser(currentUser));
      // redirect to guest screen
      if (currentUser.guestStatus === 'WAIT') {
        navigation.navigate('GuestScreen');
      } else if (currentUser.loggedOut) {
        navigation.navigate('FeedbackScreen', { currentUser });
      } else if (currentUser.joined) {
        navigation.navigate('DrawerNavigator');
      }
    }
  }, [currentUser?.guestStatus, currentUser?.joined, currentUser?.loggedOut]);

  if (!loading && !error) {
    // eslint-disable-next-line no-prototype-builtins
    if (!data?.hasOwnProperty('user_current')
          // eslint-disable-next-line eqeqeq
          || data.user_current.length == 0
    ) {
      return (
        <Text>
          Error: User not found
        </Text>
      );
    }

    return (
      <Text style={{ color: 'black' }}>Loading...</Text>
    );
  }
};

export default UserJoinScreen;
