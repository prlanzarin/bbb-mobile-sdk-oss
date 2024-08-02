import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSubscription } from "@apollo/client";
import { setProfile } from "../../store/redux/slices/wide-app/modal";
import useCurrentUser from "../../graphql/hooks/useCurrentUser";
import Queries from "./queries";

const useModalListener = () => {
  const dispatch = useDispatch();

  // CurrentUser
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.user_current[0];
  const currentUserId = currentUser?.userId;

  // Breakouts
  const { data: breakoutInviteData } = useSubscription(Queries.BREAKOUT_INVITE_SUBSCRIPTION);
  const breakoutsData = breakoutInviteData?.breakoutRoom;
  const isFreeJoin = breakoutInviteData?.breakoutRoom[0]?.freeJoin;
  const hasBreakouts = breakoutsData?.length > 0;
  const amIModerator = currentUser?.isModerator;

  useEffect(() => {
    if (hasBreakouts && currentUserId) {
      const isUserCurrentlyInRoom = breakoutsData.find(
        (room) => room.isUserCurrentlyInRoom,
      );

      if (!isUserCurrentlyInRoom) {
        if (isFreeJoin || amIModerator) {
          handleDispatch();
        }

        const lastAssignedRoom = breakoutsData.find(
          (room) => room.isLastAssignedRoom,
        );

        if (lastAssignedRoom) {
          handleDispatch(lastAssignedRoom);
        }
      }
    }
  }, [breakoutsData?.length, currentUserId]);

  const handleDispatch = (breakout = {}) => {
    dispatch(
      setProfile({
        profile: "breakout_invite",
        extraInfo: {
          shortName: breakout?.shortName,
          joinURL: breakout?.joinURL,
          freeJoinOrModerator: isFreeJoin || amIModerator,
        },
      }),
    );
    return;
  };

  return null;
};

export default useModalListener;
