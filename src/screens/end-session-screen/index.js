import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../hooks/use-orientation';
import Styled from './styles';

const EndSessionScreen = (props) => {
  const { onLeaveSession } = props;

  const { t } = useTranslation();
  const orientation = useOrientation();
  const navigation = useNavigation();

  const handleLeaveSessionButtonPress = () => {
    if (!onLeaveSession) {
      return navigation.navigate('DrawerNavigator');
    }
  };

  return (
    <Styled.ContainerView>
      <Styled.Image
        source={require('../../assets/application/endSessionImage.png')}
        resizeMode="contain"
        orientation={orientation}
      />
      <Styled.Title>{t('app.customFeedback.email.thank')}</Styled.Title>
      <Styled.Subtitle>{t('mobileSdk.endSession.subtitle')}</Styled.Subtitle>
      <Styled.ButtonContainer>
        <Styled.ConfirmButton onPress={handleLeaveSessionButtonPress}>
          {t('app.leaveModal.confirm')}
        </Styled.ConfirmButton>
      </Styled.ButtonContainer>
    </Styled.ContainerView>
  );
};

export default EndSessionScreen;
