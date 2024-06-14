import React, { useCallback, useState } from 'react';
import { FlatList, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { selectSortedVideoUsers } from '../../../store/redux/slices/video-streams';
import Styled from './styles';

const DEVICE_HEIGHT = parseInt(Dimensions.get('window').height, 10);

const GridView = () => {
  const videoUsers = useSelector(selectSortedVideoUsers);
  const [numOfColumns, setNumOfColumns] = useState(1);

  useFocusEffect(
    useCallback(() => {
      setNumOfColumns(videoUsers.length > 2 ? 2 : 1);
    }, [videoUsers])
  );

  const renderItem = (videoUser) => {
    const { item: vuItem } = videoUser;
    const {
      cameraId,
      userId,
      userAvatar,
      userColor,
      name,
      local,
      visible,
      userRole,
      userEmoji,
    } = vuItem;

    return (
      <Styled.Item
        usersCount={videoUsers.length}
        dimensionHeight={DEVICE_HEIGHT - 90}
      >
        <Styled.VideoListItem
          cameraId={cameraId}
          userId={userId}
          userAvatar={userAvatar}
          userColor={userColor}
          userName={name}
          local={local}
          visible={visible}
          isGrid
          usersCount={videoUsers.length}
          userRole={userRole}
          userEmoji={userEmoji}
        />
      </Styled.Item>
    );
  };

  return (
    <>
      <Styled.ContainerViewItem
        dimensionHeight={DEVICE_HEIGHT - 90}
        usersCount={videoUsers.length}
      >
        <Styled.ContentArea />
      </Styled.ContainerViewItem>
      <FlatList
        data={videoUsers}
        style={Styled.styles.container}
        renderItem={renderItem}
        numColumns={numOfColumns}
        initialNumToRender={2}
        key={numOfColumns}
        disableIntervalMomentum
      />

    </>

  );
};

export default GridView;
