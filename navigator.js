import { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import Colors from './src/constants/colors';
import LoadingScreen from './src/screens/loading-screen';
import useJoinMeeting from './src/graphql/hooks/use-join-meeting';
import Auth from './src/graphql/collections/auth';

// Screens

const MainNavigator = () => {
  const Stack = createStackNavigator();
  const navigation = useNavigation();
  const joinObject = useJoinMeeting();

  const {
    graphqlUrlApolloClient,
    sessionToken,
    loginStage,
    clientStartupSettings,
    clientSettings
  } = joinObject;

  useEffect(() => {
    if (loginStage === 6) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'AuthScreen' }]
      });
    }
  }, [loginStage]);

  if (loginStage <= 5) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <ApolloProvider client={graphqlUrlApolloClient}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.blue },
          headerTintColor: Colors.white,
          contentStyle: { backgroundColor: Colors.white },
          headerTitleAlign: 'center',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="LoadingScreen"
          component={LoadingScreen}
          options={{
            title: 'Loading Screen',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AuthScreen"
          component={Auth}
          options={{
            title: 'Auth Screen',
            headerShown: false,
          }}
        />
        {/* <GuestScreen />
      <DrawerNavigator />
      <EndNavigator />
      <TransferScreen /> */}
      </Stack.Navigator>
    </ApolloProvider>
  );
};

export default MainNavigator;
