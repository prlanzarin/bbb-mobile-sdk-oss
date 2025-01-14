import * as Notifications from 'expo-notifications';
import { useMutation } from '@apollo/client';
import LeaveQueries from '../components/custom-drawer/queries';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NotificationController = () => {
  const [notification, setNotification] = useState()
  const notificationListener = useRef();
  const responseListener = useRef();
  const audioIsConnected = useSelector((state) => state.audio.isConnected);

  const { t } = useTranslation()
  const [dispatchLeaveSession] = useMutation(LeaveQueries.USER_LEAVE_MEETING);

  Notifications.setNotificationChannelAsync('main_meeting_channel', {
    name: t('mobileSdk.notification.label'),
  })

  Notifications.setNotificationCategoryAsync("main", [
    {
      buttonTitle: t('app.leaveModal.confirm'),
      identifier: 'leave',
    },
  ])

  const scheduleNotification = async () => {
    await Notifications.dismissAllNotificationsAsync()
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('mobileSdk.notification.title'),
        body: t('mobileSdk.notification.body'),
        categoryIdentifier: "main",
      },
      trigger: null,
    });
  }

  useEffect(() => {
    if (audioIsConnected) {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification)
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(response);
      });

      scheduleNotification()
    }

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };

  }, [audioIsConnected]);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      await Notifications.requestPermissionsAsync()
    };
    requestNotificationPermission();

  }, []);

  // handle buttons
    Notifications.addNotificationResponseReceivedListener((response) => {
      Notifications.getNotificationCategoriesAsync().then((categories) => {
        if (response.actionIdentifier === "leave") {
          Notifications.dismissAllNotificationsAsync()
          dispatchLeaveSession();
        }
      });
    })

  return null;
};

export default NotificationController;
