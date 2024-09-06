import { useMutation, useSubscription } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { GET_USER_CURRENT, USER_JOIN_MUTATION } from './queries';
import { setConnected, setInitialCurrentUser, setLoggedIn } from '../../store/redux/slices/wide-app/client';
import VideoManager from '../../services/webrtc/video-manager';
import logger from '../../services/logger';
import Styled from './styles';

const r = Math.floor(Math.random() * 5) + 1;

const UserJoinScreen = () => {
  const navigation = useNavigation();
  const [dispatchUserJoin] = useMutation(USER_JOIN_MUTATION);
  const { data, loading, error } = useSubscription(GET_USER_CURRENT);
  const sessionToken = useSelector((state) => state.client.meetingData.sessionToken);
  const host = useSelector((state) => state.client.meetingData.host);
  const currentUser = data?.user_current[0];
  const userId = currentUser?.userId;

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const initializeMediaManagers = () => {
    const mediaManagerConfigs = {
      userId,
      host,
      sessionToken,
      logger
    };
    console.log({ userId, host, sessionToken });
    VideoManager.init(mediaManagerConfigs);
    // AudioManager.init(mediaManagerConfigs);
    // ScreenshareManager.init(mediaManagerConfigs);
  };

  const destroyMediaManagers = () => {
    VideoManager.destroy();
    // AudioManager.destroy();
    // ScreenshareManager.destroy();
  };

  useEffect(() => {
    if (sessionToken && host && userId) {
      initializeMediaManagers();
    }
    // destroyMediaManagers();
  }, [sessionToken, host, userId]);

  const handleDispatchUserJoin = (authToken) => {
    dispatchUserJoin({
      variables: {
        authToken,
        clientType: 'HTML5',
        clientIsMobile: true,
      },
    });
  };

  useEffect(() => {
    if (currentUser) {
      handleDispatchUserJoin(currentUser.authToken);
      dispatch(setInitialCurrentUser(currentUser));
      dispatch(setConnected(true));
      dispatch(setLoggedIn(true));
      if (currentUser.guestStatus === 'WAIT') {
        navigation.navigate('GuestScreen');
      } else if (currentUser?.meeting?.ended) {
        navigation.navigate('FeedbackScreen', {
          currentUser: {
            ...currentUser,
            leaveReason: 'meetingEnded'
          }
        });
      } else if (currentUser.loggedOut) {
        navigation.navigate('FeedbackScreen', {
          currentUser: {
            ...currentUser,
            leaveReason: 'loggedOut'
          }
        });
      } else if (currentUser.ejected) {
        navigation.navigate('FeedbackScreen', {
          currentUser: {
            ...currentUser,
            leaveReason: 'kicked'
          }
        });
      } else if (currentUser.joined) {
        navigation.navigate('DrawerNavigator');
      }
    }
  }, [currentUser?.guestStatus, currentUser?.joined, currentUser?.loggedOut]);

  if (!loading && !error) {
    // eslint-disable-next-line no-prototype-builtins
    if (!data?.hasOwnProperty('user_current')
      // eslint-disable-next-line eqeqeq
      || data.user_current.length == 0
    ) {
      return (
        <Text>
          Error: User not found
        </Text>
      );
    }

    return (
      <Styled.ContainerView>
        <Styled.Loading />
        <Styled.TitleText>
          {t(`mobileSdk.join.loading.label.${r}`)}
        </Styled.TitleText>
      </Styled.ContainerView>
    );
  }
};

export default UserJoinScreen;
