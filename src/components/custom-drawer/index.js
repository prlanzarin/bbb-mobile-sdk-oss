import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@apollo/client';
import { Share } from 'react-native';
import {
  DrawerItemList,
} from '@react-navigation/drawer';
import { useOrientation } from '../../hooks/use-orientation';
import { setExpandActionsBar } from '../../store/redux/slices/wide-app/layout';
import { setProfile } from '../../store/redux/slices/wide-app/modal';
import logger from '../../services/api';
import * as api from '../../services/api';
import { leave } from '../../store/redux/slices/wide-app/client';
import Settings from '../../../settings.json';
import Styled from './styles';
import Queries from './queries';

const CustomDrawer = (props) => {
  const { meetingUrl, navigation } = props;
  const dispatch = useDispatch();
  const { data } = useSubscription(Queries.USER_CURRENT_SUBSCRIPTION);
  const { t } = useTranslation();

  const currentUserObj = data?.user_current[0];
  const isBreakoutRoom = currentUserObj?.meeting?.isBreakout;
  const isLandscape = useOrientation() === 'LANDSCAPE';

  const leaveSession = () => {
    dispatch(leave(api));
  };

  const onClickFeatureNotImplemented = () => {
    dispatch(setProfile({ profile: 'not_implemented' }));
    navigation.closeDrawer();
  };

  const onClickAudioSelector = () => {
    dispatch(setExpandActionsBar(true));
    navigation.closeDrawer();
  };

  const onClickShare = async () => {
    try {
      await Share.share({
        message: meetingUrl,
      });
    } catch (error) {
      logger.error({
        logCode: 'error_sharing_link',
        extraInfo: { error },
      }, `Exception thrown while clicking to share meeting_url: ${error}`);
    }
  };

  const renderBottomDrawerItems = () => (
    <>
      <Styled.DrawerItemBottom
        label={t('mobileSdk.audio.deviceSelector.title')}
        onPress={onClickAudioSelector}
        iconName="bluetooth-audio"
      />
      {!isBreakoutRoom && meetingUrl && (
        <Styled.DrawerItemBottom
          label={t('mobileSdk.drawer.shareButtonLabel')}
          onPress={onClickShare}
          iconName="share"
        />
      )}
      <Styled.DrawerItemBottom
        label={isBreakoutRoom
          ? t('mobileSdk.breakout.leave')
          : t('app.navBar.settingsDropdown.leaveSessionLabel')}
        onPress={leaveSession}
        iconName="logout"
      />
    </>
  );

  const renderNotImplementedItem = () => (
    <Styled.DrawerItemNotImplemented
      label={t('app.actionsBar.actionsDropdown.streamOptions')}
      onPress={onClickFeatureNotImplemented}
      iconName="connected-tv"
    />
  );

  return (
    <Styled.ViewContainer>
      <Styled.DrawerScrollView {...props}>
        <Styled.CustomDrawerContainer>
          <Styled.UserAvatarDrawer currentUser={currentUserObj} />
          <Styled.NameUserAvatar numberOfLines={1}>
            {currentUserObj?.name}
          </Styled.NameUserAvatar>
        </Styled.CustomDrawerContainer>
        <Styled.ContainerDrawerItemList>
          <DrawerItemList {...props} />
          {Settings.showNotImplementedFeatures && renderNotImplementedItem()}
          {isLandscape && renderBottomDrawerItems()}
        </Styled.ContainerDrawerItemList>
      </Styled.DrawerScrollView>
      <Styled.ContainerCustomBottomButtons>
        {!isLandscape && renderBottomDrawerItems()}
      </Styled.ContainerCustomBottomButtons>
    </Styled.ViewContainer>
  );
};

export default CustomDrawer;
