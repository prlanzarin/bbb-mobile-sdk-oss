import { useTranslation } from 'react-i18next';
import Styled from './styles';

const PiPView = () => {
  const { t } = useTranslation();

  return (
    <Styled.ContainerView>
      <Styled.Title>{t('app.customFeedback.email.thank')}</Styled.Title>
    </Styled.ContainerView>
  );
};

export default PiPView;
