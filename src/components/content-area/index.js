import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import { selectScreenshare } from '../../store/redux/slices/screenshare';
import WhiteboardScreen from '../../screens/whiteboard-screen';
import {
  setDetailedInfo,
  setFocusedElement,
  setFocusedId,
  setIsFocused,
  setIsPiPEnabled
} from '../../store/redux/slices/wide-app/layout';
import Styled from './styles';

const ContentArea = (props) => {
  const { style, fullscreen } = props;
  const { PictureInPictureModule } = NativeModules;

  const slidesStore = useSelector((state) => state.slidesCollection);
  const presentationsStore = useSelector((state) => state.presentationsCollection);
  const screenshare = useSelector(selectScreenshare);
  const detailedInfo = useSelector((state) => state.layout.detailedInfo);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const isAndroid = Platform.OS === 'android';

  const handleSlideAndPresentationActive = useCallback(() => {
    // TODO Review this collection after update the 2.6 code
    const currentPresentation = Object.values(
      presentationsStore.presentationsCollection
    ).filter((obj) => {
      return obj.current === true;
    });

    const currentSlideList = Object.values(slidesStore.slidesCollection).filter(
      (obj) => {
        return (
          obj.current === true
          && obj.presentationId === currentPresentation[0]?.id
        );
      }
    );
    const imageUri = currentSlideList[0]?.imageUri;
    return imageUri?.replace('/svg/', '/png/');
  }, [presentationsStore, slidesStore]);

  const handleFullscreenClick = () => {
    dispatch(setIsFocused(true));
    dispatch(setFocusedId(handleSlideAndPresentationActive()));
    dispatch(setFocusedElement('contentArea'));
    navigation.navigate('FullscreenWrapperScreen');
  };

  const handleEnterPiPClick = () => {
    PictureInPictureModule.setPictureInPictureEnabled(true);
    PictureInPictureModule.enterPictureInPicture();
    dispatch(setIsPiPEnabled(true));
    dispatch(setDetailedInfo(false));
  };

  // ** Content area views methods **
  const presentationView = () => (
    <Styled.Presentation
      width="100%"
      height="100%"
      source={{
        uri: handleSlideAndPresentationActive(),
      }}
    />
  );

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

  return (
    <Styled.ContentAreaPressable>
      {!screenshare && presentationView()}
      {screenshare && screenshareView()}
      {detailedInfo && (
        <>
          <Styled.NameLabelContainer>
            <Styled.NameLabel
              numberOfLines={1}
            >
              {screenshare ? t('app.content.screenshare') : t('app.content.presentation')}
            </Styled.NameLabel>
          </Styled.NameLabelContainer>

          <Styled.FullscreenIcon
            isScreensharing={screenshare}
            onPress={handleFullscreenClick}
          />

          {isAndroid && false && <Styled.PIPIcon onPress={handleEnterPiPClick} />}
        </>
      )}
    </Styled.ContentAreaPressable>

  );
};

export default ContentArea;
