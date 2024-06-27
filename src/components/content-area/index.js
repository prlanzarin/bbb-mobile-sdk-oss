import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeModules, Platform } from 'react-native';
import { selectScreenshare } from '../../store/redux/slices/screenshare';
import WhiteboardScreen from '../../screens/whiteboard-screen';
import { isPresenter } from '../../store/redux/slices/current-user';
import {
  setDetailedInfo,
  setFocusedElement,
  setFocusedId,
  setIsFocused,
  setIsPiPEnabled,
  setIsPresentationOpen
} from '../../store/redux/slices/wide-app/layout';
import Styled from './styles';

const ContentArea = (props) => {
  const { style, fullscreen } = props;
  const { PictureInPictureModule } = NativeModules;

  const presentationsStore = useSelector((state) => state.presentationsCollection);
  const screenshare = useSelector(selectScreenshare);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const amIPresenter = useSelector(isPresenter);

  const isAndroid = Platform.OS === 'android';

  const handleSlideAndPresentationActive = useCallback(() => {
    const currentPresentation = Object.values(
      presentationsStore.presentationsCollection
    ).filter((obj) => obj.current);
    if (currentPresentation.length === 0) {
      return;
    }
    const imageUri = currentPresentation[0]?.currentSlideSvgUri;
    return imageUri?.replace('/svg/', '/png/');
  }, [presentationsStore]);

  const handleFullscreenClick = () => {
    dispatch(setIsFocused(true));
    dispatch(setFocusedId(screenshare ? 'screenshare' : 'whiteboard'));
    dispatch(setFocusedElement('contentArea'));
    navigation.navigate('FullscreenWrapperScreen');
  };

  const handleMinimizeClick = () => {
    dispatch(setIsPresentationOpen(false));
  };

  const handleEnterPiPClick = () => {
    PictureInPictureModule.setPictureInPictureEnabled(true);
    PictureInPictureModule.enterPictureInPicture();
    dispatch(setIsPiPEnabled(true));
    dispatch(setDetailedInfo(false));
  };

  // ** Content area views methods **
  const presentationView = () => {
    if (!amIPresenter) {
      return (
        <WhiteboardScreen />
      );
    }
    return (
      <Styled.Presentation
        width="100%"
        height="100%"
        source={{
          uri: handleSlideAndPresentationActive(),
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

  return (
    <Styled.ContentAreaPressable>
      {!screenshare && presentationView()}
      {screenshare && screenshareView()}
      <>
        <Styled.FullscreenIcon
          isScreensharing={screenshare}
          onPress={handleFullscreenClick}
        />
        <Styled.MinimizeIcon
          onPress={handleMinimizeClick}
        />
        {isAndroid && false && <Styled.PIPIcon onPress={handleEnterPiPClick} />}
      </>
    </Styled.ContentAreaPressable>

  );
};

export default ContentArea;
