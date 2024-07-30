import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSubscription } from '@apollo/client';
import { setProfile } from '../../store/redux/slices/wide-app/modal';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import Queries from './queries';

const useModalListener = () => {
  const dispatch = useDispatch();
  const { data: breakoutInviteData } = useSubscription(Queries.BREAKOUT_INVITE_SUBSCRIPTION);
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.user_current[0];
  const currentUserId = currentUser?.userId;

  // ? breakout_invite effect
  useEffect(() => {
    if (breakoutInviteData && currentUserId) {
      dispatch(setProfile({
        profile: 'breakout_invite',
        extraInfo: {
          freeJoin: breakoutInviteData?.freeJoin,
          shortName: breakoutInviteData?.shortName,
          joinURL: breakoutInviteData?.joinURL
        }
      }));
    }
  }, [breakoutInviteData, currentUserId]);

  return null;
};

export default useModalListener;
