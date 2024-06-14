import styled from 'styled-components/native';
import { StyleSheet } from 'react-native';
import VideoContainer from '../video-container';
import contentArea from '../../content-area';

const VideoListItem = styled(VideoContainer)`
  width: 100%;
  height: 100%;
`;

const ContentArea = styled(contentArea)`
`;

const Item = styled.View`
  display: flex;
  background-color: #d0c4cb;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  ${({ dimensionHeight, isPresentationOpen }) => dimensionHeight // 1 user
  && isPresentationOpen
  && `
    height: ${parseInt((dimensionHeight * 2) / 3, 10)}px;
  `}

  ${({ dimensionHeight, usersCount, isPresentationOpen }) => dimensionHeight // 2 user
  && isPresentationOpen
  && usersCount === 2
  && `
    height: ${parseInt((dimensionHeight) / 3, 10)}px;
  `}


  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 0
  && isPresentationOpen
  && usersCount > 2
  && `
      width: 50%;
      height: ${parseInt((dimensionHeight) / 3, 10)}px;
  `}

  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 1
  && isPresentationOpen
  && usersCount > 2
  && `
      width: 50%;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 0;
      height: ${parseInt((dimensionHeight) / 3, 10)}px;
  `}

  ${({ dimensionHeight, isPresentationOpen }) => dimensionHeight // 1 user
  && !isPresentationOpen
  && `
    height: ${parseInt((dimensionHeight * 3) / 3, 10)}px;
  `}

  ${({ dimensionHeight, usersCount, isPresentationOpen }) => dimensionHeight // 2 user
  && !isPresentationOpen
  && usersCount === 2
  && `
    height: ${parseInt((dimensionHeight * 1.5) / 3, 10)}px;
  `}


  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 0
  && !isPresentationOpen
  && usersCount > 2
  && `
      width: 50%;
      height: ${parseInt((dimensionHeight * 1.5) / 3, 10)}px;
  `}

  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 1
  && !isPresentationOpen
  && usersCount > 2
  && `
      width: 50%;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 0;
      height: ${parseInt((dimensionHeight * 1.5) / 3, 10)}px;
  `}

  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 0
  && !isPresentationOpen
  && usersCount > 4
  && `
      width: 50%;
      height: ${parseInt((dimensionHeight * 1) / 3, 10)}px;
  `}

  ${({ usersCount, dimensionHeight, isPresentationOpen }) => usersCount % 2 === 1
  && !isPresentationOpen
  && usersCount > 4
  && `
      width: 50%;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 0;
      height: ${parseInt((dimensionHeight * 1) / 3, 10)}px;
  `}

`;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  }
});

const ContainerViewItem = styled.View`
  display: flex;
  background-color: #d0c4cb;
  align-items: center;
  justify-content: center;
  width: 100%;

  ${({ isPresentationOpen }) => !isPresentationOpen
  && `
      display: none;
  `}

  ${({ dimensionHeight }) => dimensionHeight
  && `
    height: ${parseInt(dimensionHeight / 3, 10)}px;
  `}
`;

export default {
  VideoListItem,
  ContentArea,
  styles,
  Item,
  ContainerViewItem
};
