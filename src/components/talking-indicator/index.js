import { useSelector, useDispatch } from 'react-redux';
import Styled from './styles';
import { setIsPresentationOpen } from '../../store/redux/slices/wide-app/layout';

const TalkingIndicator = () => {
  const isPresentationOpen = useSelector((state) => state.layout.isPresentationOpen);
  const dispatch = useDispatch();
  const VoiceUsersCollection = useSelector(
    (state) => state.voiceUsersCollection.voiceUsersCollection
  );
  const callersTalking = Object.values(VoiceUsersCollection)
    .filter((call) => call.talking)
    .map((call) => ({ callerName: call.callerName.replaceAll('+', ' '), voiceUserId: call.voiceUserId }));

  return (
    <>
      <Styled.ShowPresentationIcon
        isPresentationOpen={isPresentationOpen}
        onPress={() => dispatch(setIsPresentationOpen(true))}
      />
      <Styled.Container>
        {callersTalking.map((userObj) => (
          <Styled.TextContainer key={userObj.voiceUserId}>
            <Styled.MicIcon />
            <Styled.Text numberOfLines={1}>{userObj.callerName}</Styled.Text>
          </Styled.TextContainer>
        ))}
      </Styled.Container>
    </>
  );
};

export default TalkingIndicator;
