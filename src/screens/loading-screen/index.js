import { useTranslation } from 'react-i18next';
import Styled from './styles';

const r = Math.floor(Math.random() * 5) + 1;

const LoadingScreen = () => {
  const { t } = useTranslation();

  return (
    <Styled.ContainerView>
      <Styled.Loading />
      <Styled.TitleText>
        {t(`mobileSdk.join.loading.label.${r}`)}
      </Styled.TitleText>
    </Styled.ContainerView>
  );
};

export default LoadingScreen;
