import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useSubscription } from "@apollo/client";
import { setProfile } from "../../store/redux/slices/wide-app/modal";
import useCurrentUser from "../../graphql/hooks/useCurrentUser";
import useCurrentPoll from "../../graphql/hooks/useCurrentPoll";
import usePublishedPolls from "../../graphql/hooks/usePublishedPolls.js";
import Queries from "./queries";

const useModalListener = () => {
  const dispatch = useDispatch();

  // CurrentUser
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.user_current[0];
  const currentUserId = currentUser?.userId;

  // Breakouts
  const { data: breakoutInviteData } = useSubscription(
    Queries.BREAKOUT_INVITE_SUBSCRIPTION,
  );
  const breakoutsData = breakoutInviteData?.breakoutRoom;
  const isFreeJoin = breakoutInviteData?.breakoutRoom[0]?.freeJoin;
  const hasBreakouts = breakoutsData?.length > 0;
  const amIModerator = currentUser?.isModerator;

  // Active Polls
  const { data: pollData } = useCurrentPoll();
  const activePollData = pollData?.poll[0];
  const hasCurrentPoll = pollData?.poll?.length > 0;

  // Published Polls
  const { data: publishedData } = usePublishedPolls();
  const publishedPollData = publishedData?.poll;
  const hasPublishedPolls = publishedPollData?.length > 0;
  const prevPublishedPollCount = useRef(undefined);

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
          activePollData: activePollData,
        });
      }
    }

    // Published
    if (hasPublishedPolls && currentUserId) {
      const currentCount = publishedPollData?.length;

      if (prevPublishedPollCount.current === undefined) {
        prevPublishedPollCount.current = currentCount;

      } else if (currentCount > prevPublishedPollCount.current) {
        prevPublishedPollCount.current = currentCount;

        handleDispatch("poll_published", {
          lastPublishedPoll: publishedPollData[0],
        });
      }
    }
  }, [
    breakoutsData?.length,
    activePollData,
    publishedPollData?.length,
    currentUserId,
  ]);

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
