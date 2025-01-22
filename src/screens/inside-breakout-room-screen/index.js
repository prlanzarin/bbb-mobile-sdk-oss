import React from 'react';
// import BbbBreakoutSdk from 'bbb-breakout-sdk';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

const InsideBreakoutRoomScreen = (props) => {
  const { route } = props;
  const { i18n } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  return (
    // <BbbBreakoutSdk
    //   jUrl={route.params.joinUrl}
    //   onLeaveSession={() => {
    //     if (navigation.canGoBack()) {
    //       navigation.goBack();
    //     }
    //     joinMicrophone();
    //   }}
    //   defaultLanguage={i18n.language}
    // />
    <></>
  );
};

export default InsideBreakoutRoomScreen;
