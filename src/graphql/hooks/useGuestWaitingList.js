import { useMemo } from 'react';
import { useSubscription } from '@apollo/client';
import { GET_GUEST_WAITING_USERS_SUBSCRIPTION } from '../queries/guestSubscription';

const useGuestWaitingList = () => {
  const { data, loading, error } = useSubscription(GET_GUEST_WAITING_USERS_SUBSCRIPTION);

  const guestWaitingList = useMemo(() => {
    return {
      data: data ? data : null,
      loading,
      error
    };
  }, [data, loading, error]);

  return guestWaitingList;
};

export default useGuestWaitingList;
