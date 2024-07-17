import * as Linking from 'expo-linking';
import { useSubscription } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Alert, NativeModules, Platform } from 'react-native';
import { selectScreenshare } from '../../store/redux/slices/screenshare';
import WhiteboardScreen from '../../screens/whiteboard-screen';
import {
  setDetailedInfo,
  setFocusedElement,
  setFocusedId,
  setIsFocused,
  setIsPiPEnabled,
  setIsPresentationOpen
} from '../../store/redux/slices/wide-app/layout';
import Styled from './styles';
import Settings from '../../../settings.json';
import Queries from './queries';

const ContentArea = (props) => {
  const { style, fullscreen } = props;
  const { PictureInPictureModule } = NativeModules;

  const isPiPEnabled = useSelector((state) => state.layout.isPiPEnabled);
  const { data } = useSubscription(Queries.CURRENT_PRESENTATION_PAGE_SUBSCRIPTION);
  const screenshare = useSelector(selectScreenshare);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const currentSlide = data?.pres_page_curr[0].svgUrl;
  const isAndroid = Platform.OS === 'android';

  const handleFullscreenClick = () => {
    dispatch(setIsFocused(true));
    dispatch(setFocusedId(screenshare ? 'screenshare' : 'whiteboard'));
    dispatch(setFocusedElement('contentArea'));
    navigation.navigate('FullscreenWrapperScreen');
  };

  const handleMinimizeClick = () => {
    dispatch(setIsPresentationOpen(false));
  };

  const handleEnterPiPClick = async () => {
    PictureInPictureModule.setPictureInPictureEnabled(true);
    try {
      await PictureInPictureModule.enterPictureInPicture();
      dispatch(setIsPiPEnabled(true));
      dispatch(setDetailedInfo(false));
    } catch (error) {
      Alert.alert(t('mobileSdk.pip.permission.title'), t('mobileSdk.pip.permission.subtitle'), [
        {
          text: t('app.settings.main.cancel.label'),
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: t('app.settings.main.label'),
          onPress: () => {
            Linking.openSettings();
          }
        },
      ]);
    }
  };

  // ** Content area views methods **
  const presentationView = () => {
    return (
      <Styled.Presentation
        width="100%"
        height="100%"
        source={{
          uri: currentSlide,
        }}
      />
    ); };

  const screenshareView = () => (
    <Styled.Screenshare style={style} />
  );

  // ** return methods **
  if (fullscreen) {
    return (
      <>
        {!screenshare && <WhiteboardScreen />}
        {screenshare && screenshareView()}
      </>
    );
  }

  const renderIcons = () => {
    if (isPiPEnabled) {
      return null;
    }

    return (
      <>
        <Styled.FullscreenIcon
          isScreensharing={screenshare}
          onPress={handleFullscreenClick}
        />
        <Styled.MinimizeIcon
          onPress={handleMinimizeClick}
        />
        {isAndroid && !Settings.dev && (
          <Styled.PIPIcon
            onPress={handleEnterPiPClick}
          />
        )}
      </>
    );
  };

  return (
    <Styled.ContentAreaPressable>
      {!screenshare && presentationView()}
      {screenshare && screenshareView()}
      {renderIcons()}
    </Styled.ContentAreaPressable>

  );
};

export default ContentArea;
