import { SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import withPortal from '../../components/high-order/with-portal';
import { setBottomChatOpen } from '../../store/redux/slices/wide-app/chat';
import { useOrientation } from '../../hooks/use-orientation';
import Colors from '../../constants/colors';
import Styled from './styles';
import { selectSortedVideoUsers } from '../../store/redux/slices/video-streams';

const ClassroomMainScreen = () => {
  // variables
  const videoUsers = useSelector(selectSortedVideoUsers);
  const loggingIn = useSelector((state) => state.client.sessionState.loggingIn);
  const orientation = useOrientation();
  const [switchLandscapeLayout, setSwitchLandscapeLayout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    setIsLoading(loggingIn);
  }, [loggingIn]);

  /* view components */
  const renderPortraitOrientation = () => {
    return (
      <SafeAreaView>
        <Styled.ContainerView>
          <Styled.VideoListContainer>
            <Styled.VideoList videoUsers={videoUsers} />
          </Styled.VideoListContainer>

          <Styled.ContentAreaContainer>
            <Styled.ContentArea width="100%" height="100%" />
          </Styled.ContentAreaContainer>

          <Styled.ChatContainer>
            <Styled.Chat
              onPressItem={() => dispatch(setBottomChatOpen(true))}
            />
          </Styled.ChatContainer>

          <Styled.ActionsBarContainer>
            <Styled.ActionsBar />
          </Styled.ActionsBarContainer>
        </Styled.ContainerView>
      </SafeAreaView>
    );
  };

  const renderLandscapeOrientation = () => {
    return (
      <SafeAreaView>
        <Styled.ContainerView orientation={orientation}>
          <Styled.ContentAreaContainer orientation={orientation}>
            <>
              {switchLandscapeLayout && (
                <Styled.ContentArea width="100%" height="100%" />
              )}
              {!switchLandscapeLayout && (
                <Styled.VideoListContainer orientation={orientation}>
                  <Styled.VideoList
                    videoUsers={videoUsers}
                    orientation={orientation}
                  />
                </Styled.VideoListContainer>
              )}
              <Styled.SwitchLayoutButton
                icon="animation-play-outline"
                iconColor={Colors.lightGray300}
                containerColor={Colors.lightGray100}
                animated
                onPress={() => setSwitchLandscapeLayout((prevState) => !prevState)}
              />
            </>
          </Styled.ContentAreaContainer>
          <Styled.ActionsBarContainer orientation={orientation}>
            <Styled.ActionsBar orientation={orientation} />
          </Styled.ActionsBarContainer>
        </Styled.ContainerView>
      </SafeAreaView>
    );
  };

  /*  return area  */
  if (isLoading) return Styled.renderSkeletonLoading();
  if (orientation === 'PORTRAIT') return renderPortraitOrientation();
  return renderLandscapeOrientation();
};

export default withPortal(ClassroomMainScreen);
