import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSubscription } from "@apollo/client";
import { setProfile } from "../../store/redux/slices/wide-app/modal";
import useCurrentUser from "../../graphql/hooks/useCurrentUser";
import useCurrentPoll from "../../graphql/hooks/useCurrentPoll";
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

  // Polls
  const { data: pollData } = useCurrentPoll();
  const activePollData = pollData?.poll[0];
  const hasCurrentPoll = pollData?.poll?.length > 0;

  useEffect(() => {
    // Breakouts
    if (hasBreakouts && currentUserId) {
      const isUserCurrentlyInRoom = breakoutsData.find(
        (room) => room.isUserCurrentlyInRoom,
      );

      if (!isUserCurrentlyInRoom) {
        if (isFreeJoin || amIModerator) {
          handleDispatch("breakout_invite", {
            freeJoinOrModerator: isFreeJoin || amIModerator,
          });
        }

        const lastAssignedRoom = breakoutsData.find(
          (room) => room.isLastAssignedRoom,
        );

        if (lastAssignedRoom) {
          handleDispatch("breakout_invite", {
            shortName: lastAssignedRoom?.shortName,
            joinURL: lastAssignedRoom?.joinURL,
            freeJoinOrModerator: isFreeJoin || amIModerator,
          });
        }
      }
    }

    // Polls
    if (hasCurrentPoll && currentUserId) {
      // Responded
      if (!activePollData?.userCurrent?.responded) {
        handleDispatch("receive_poll", {
          isModerator: amIModerator,
          activePollData: activePollData
        })
      }

    }

  }, [breakoutsData?.length, activePollData, currentUserId]);

  const handleDispatch = (profile, extraArgs = {}) => {
    dispatch(
      setProfile({
        profile,
        extraInfo: {
          ...extraArgs,
        },
      }),
    );
    return;
  };

  return null;
};

export default useModalListener;
