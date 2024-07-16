import { useMutation, useSubscription } from '@apollo/client';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import Queries from './queries';

const UserJoinScreen = () => {
  const navigation = useNavigation();

  const [dispatchUserJoin] = useMutation(Queries.USER_JOIN_MUTATION);
  const { loading, error, data } = useSubscription(Queries.USER_CURRENT_SUBSCRIPTION);

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
    if (data?.user_current) {
      handleDispatchUserJoin(data.user_current[0].authToken);
      console.log(JSON.stringify(data, null, 2));
      if (data.user_current[0].joined) {
        console.log("Joined")
        console.log(navigation.navigate('DrawerNavigator'));
      }
    }
  }, [data]);

  if (!loading && !error) {
    // eslint-disable-next-line no-prototype-builtins
    if (!data.hasOwnProperty('user_current')
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
