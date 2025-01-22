import { useMemo } from 'react';
import { useSubscription } from '@apollo/client';
import MEETING_SUBSCRIPTION from '../queries/meetingSubscription';

const useMeeting = () => {
  const { data, loading, error } = useSubscription(MEETING_SUBSCRIPTION);

  const meetingData = useMemo(() => {
    return {
      data: data || null,
      loading,
      error
    };
  }, [data, loading, error]);

  return meetingData;
};

export default useMeeting;
