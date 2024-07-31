import React, {
  useCallback, useRef, useState
} from 'react';
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PORTRAIT, OrientationLocker } from 'react-native-orientation-locker';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import * as Device from 'expo-device';
import axios from 'axios';
import logger from '../../services/logger';
import { selectMeeting } from '../../store/redux/slices/meeting';
import useAppState from '../../hooks/use-app-state';
import PiPView from './pip-view';
import Settings from '../../../settings.json';
import Styled from './styles';
import Service from './service';

const POST_ROUTE = Settings.feedback.route;
const APP_IDENTIFIER = Settings.feedback.custom.appIdentifier;
const CUSTOMER_METADATA = Settings.feedback.custom.customerMetadata;

const FeedbackScreen = (props) => {
  const { t } = useTranslation();
  const leaveReason = props?.route?.params?.currentUser?.leaveReason;
  const title = t(Service.parseEndReason(leaveReason));
  const navigation = useNavigation();
  const [rating, setRating] = useState(undefined);
  const currentMeeting = useSelector(selectMeeting);
  const isPiPEnabled = useSelector((state) => state.layout.isPiPEnabled);
  const meetingData = useRef(null);
  const user = useRef(null);
  const appState = useAppState();

  const isAndroid = Platform.OS === 'android';
  const isBackgrounded = appState === 'background';

  // disables android go back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, []),
  );

  const handleNextButton = () => {
    navigation.navigate('EndSessionScreen');
  };

  const nextScreen = (payload) => {
    navigation.navigate('ProblemFeedbackScreen', { payload, meetingData: meetingData.current });
  };

  const buildFeedback = () => {
    const { role, name, intId } = user.current;
    const payload = {
      rating,
      userId: intId,
      userName: name,
      authToken,
      meetingId: currentMeeting?.meetingProp?.intId,
      comment: '',
      userRole: role,
    };
    const {
      authToken,
      confname,
      metadata = {},
    } = meetingData.current;

    const getDeviceType = () => {
      if (Platform.OS === 'ios') {
        return Platform.constants.interfaceIdiom;
      }
      return Platform.constants.uiMode;
    };

    const feedback = {
      timestamp: new Date().toISOString(),
      rating,
      session: {
        session_name: confname,
        institution_name: metadata.name,
        institution_guid: metadata[CUSTOMER_METADATA.guid],
        session_id: payload.meetingId,
      },
      device: {
        type: getDeviceType(),
        os: Platform.OS,
        browser: APP_IDENTIFIER,
        nativeAppDeviceInformation: {
          ...Device,
          appVersion: nativeApplicationVersion,
          appBuildNumber: parseInt(nativeBuildVersion, 10) || 0,
        },
      },
      user: {
        name: payload.userName,
        id: payload.userId,
        role: payload.userRole,
      },
      feedback: {
        incomplete: 'Incomplete Feedback'
      },
    };

    return feedback;
  };

  const sendStarRating = () => {
    const payload = buildFeedback();
    const { host } = meetingData.current;
    // sends partial feedback
    axios.post(`https://${host}${POST_ROUTE}`, payload).catch((e) => {
      logger.warn({
        logCode: 'app_user_feedback_not_sent_error',
        extraInfo: {
          errorName: e.name,
          errorMessage: e.message,
        },
      }, `Unable to send feedback: ${e.message}`);
    });
    nextScreen(payload);
  };

  const noRating = () => rating === undefined;

  if (isBackgrounded && isAndroid && isPiPEnabled) {
    return (
      <PiPView />
    );
  }

  return (
    <Styled.ContainerView>
      <Styled.ContainerFeedbackCard>
        <Styled.Title>{title}</Styled.Title>
        <Styled.Subtitle>{t('app.feedback.subtitle')}</Styled.Subtitle>
        <Styled.StarsRatingContainer>
          <Styled.SliderContainer>
            <Styled.StarRatingComponent
              value={rating}
              onValueChange={(value) => setRating(value[0])}
            />
          </Styled.SliderContainer>
          <Styled.StarsRatingTextContainer>
            <Styled.StarsRatingText>{1}</Styled.StarsRatingText>
            <Styled.StarsRatingText>{10}</Styled.StarsRatingText>
          </Styled.StarsRatingTextContainer>
        </Styled.StarsRatingContainer>
        <Styled.ButtonContainer>
          <Styled.ConfirmButton
            disabled={noRating()}
            onPress={handleNextButton}
          >
            {t('app.customFeedback.defaultButtons.next')}
          </Styled.ConfirmButton>
        </Styled.ButtonContainer>
        <Styled.QuitSessionButtonContainer>
          <Styled.QuitSessionButton
            onPress={() => navigation.navigate('EndSessionScreen')}
          >
            {t('app.navBar.settingsDropdown.leaveSessionLabel')}
          </Styled.QuitSessionButton>
        </Styled.QuitSessionButtonContainer>
      </Styled.ContainerFeedbackCard>
      <OrientationLocker orientation={PORTRAIT} />
    </Styled.ContainerView>
  );
};

export default FeedbackScreen;
