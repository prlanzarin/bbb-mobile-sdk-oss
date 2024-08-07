import { useMemo } from 'react';
import { useSubscription } from '@apollo/client';
import POLL_ACTIVE_SUBSCRIPTION from '../queries/useCurrentPollSubscription';

const useCurrentPoll = () => {
  const { data, loading, error } = useSubscription(POLL_ACTIVE_SUBSCRIPTION);

  const currentPollData = useMemo(() => {
    return {
      data: data || null,
      loading,
      error
    };
  }, [data, loading, error]);

  return currentPollData;
};

export default useCurrentPoll;
