import { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSubscription } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import CreatePollScreen from './create-poll-screen';
import PreviousPollsScreen from './previous-polls-screen';
import AnswerPollScreen from './answer-poll-screen';
import queries from './queries';

const PollNavigator = () => {
  const Stack = createStackNavigator();
  const { data: pollData } = useSubscription(queries.POLL_ACTIVE_SUBSCRIPTION);
  const { data: userCurrentData } = useSubscription(queries.USER_CURRENT_SUBSCRIPTION);
  const hasActivePoll = pollData?.poll?.length > 0;
  const currentUserResponded = pollData?.poll[0]?.userCurrent?.responded;
  const amIPresenter = userCurrentData?.user_current[0]?.presenter;
  const navigation = useNavigation();

  useEffect(() => {
    if (hasActivePoll && !currentUserResponded) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'AnswerPollScreen' }]
      });
      return;
    }
    navigation.reset({
      index: 1,
      routes: [{ name: 'PreviousPollsScreen' }]
    });
  }, [Boolean(hasActivePoll), amIPresenter, currentUserResponded]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: '#06172A'
        }
      }}
    >
      <Stack.Screen name="PreviousPollsScreen" component={PreviousPollsScreen} />
      <Stack.Screen name="CreatePollScreen" component={CreatePollScreen} />
      <Stack.Screen name="AnswerPollScreen" component={AnswerPollScreen} />
    </Stack.Navigator>
  );
};

export default PollNavigator;
