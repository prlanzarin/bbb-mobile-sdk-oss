import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useMutation, useSubscription } from '@apollo/client';
import { trigDetailedInfo } from '../../store/redux/slices/wide-app/layout';
import ScreenWrapper from '../../components/screen-wrapper';
import Styled from './styles';
import Queries from './queries';

const UserNotesScreen = () => {
  const host = useSelector((state) => state.client.meetingData.host);
  const sessionToken = useSelector((state) => state.client.meetingData.sessionToken);

  const dispatch = useDispatch();
  const [createSession] = useMutation(Queries.CREATE_SESSION);
  const { data: padSessionData } = useSubscription(
    Queries.PAD_SESSION_SUBSCRIPTION,
  );

  const padName = padSessionData?.sharedNotes_session[0]?.padId;
  const notesSessionId = padSessionData?.sharedNotes_session[0]?.sessionId;
  const url = `https://${host}/pad/auth_session?padName=${padName}&sessionID=${notesSessionId}&lang=pt-br&rtl=false&sessionToken=${sessionToken}`;

  const createNoteSession = () => {
    createSession({ variables: { externalId: 'notes' } });
  };

  useEffect(() => {
    createNoteSession();
    if (padName) {
      // fetch(authUrl);
    }
  }, [padName]);

  const INJECTED_JAVASCRIPT = `(function() {
    var elem = document.querySelector('li[data-key="import_export"]')
    elem.style.display = 'none';
    return false;
  })();`;

  if (padName && notesSessionId && sessionToken) {
    return (
      <ScreenWrapper renderWithView>
        <Styled.ContainerScreen>
          <Styled.ToggleActionsBarIconButton
            onPress={() => dispatch(trigDetailedInfo())}
          />
          <WebView
            source={{ uri: url }}
            javaScriptEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            injectedJavaScript={INJECTED_JAVASCRIPT}
          />
        </Styled.ContainerScreen>
      </ScreenWrapper>
    );
  }

  return null;
};

export default UserNotesScreen;
