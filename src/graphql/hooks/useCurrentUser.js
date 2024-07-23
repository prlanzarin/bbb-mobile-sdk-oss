import { useMemo } from 'react';
import { useSubscription } from '@apollo/client';
import USER_CURRENT_SUBSCRIPTION from '../queries/useCurrentUserSubscription';

const useCurrentUser = () => {
  const { data, loading, error } = useSubscription(USER_CURRENT_SUBSCRIPTION);

  const currentUserData = useMemo(() => {
    return {
      data: data ? data : null,
      loading,
      error
    };
  }, [data, loading, error]);

  return currentUserData;
};

export default useCurrentUser;
