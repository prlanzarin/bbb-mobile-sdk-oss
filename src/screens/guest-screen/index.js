import { useTranslation } from 'react-i18next';
import useCurrentUser from '../../graphql/hooks/useCurrentUser';
import Styled from './styles';

const GuestScreen = () => {
  const { data } = useCurrentUser();
  const guestStatusDetails = data?.user_current[0].guestStatusDetails;
  const { t } = useTranslation();

  return (
    <Styled.ContainerView>
      <Styled.WaitingAnimation />
      <Styled.Title>
        {t('mobileSdk.guest.screenTitle')}
      </Styled.Title>
      <Styled.Subtitle>
        { t('app.guest.guestWait')}
      </Styled.Subtitle>
      {guestStatusDetails?.guestLobbyMessage && (
      <Styled.Subtitle>
        {guestStatusDetails?.guestLobbyMessage}
      </Styled.Subtitle>
      )}
      {guestStatusDetails?.positionInWaitingQueue && (
      <Styled.Subtitle>
        {`${t('app.guest.positionInWaitingQueue')} ${guestStatusDetails?.positionInWaitingQueue}`}
      </Styled.Subtitle>
      )}
    </Styled.ContainerView>
  );
};

export default GuestScreen;
