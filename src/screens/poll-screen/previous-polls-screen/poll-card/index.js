import { useState } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { trigDetailedInfo } from '../../../../store/redux/slices/wide-app/layout';
import ActivityBar from '../../../../components/activity-bar';
import PollService from '../../service';
import Styled from './styles';

const PreviousPollCard = (props) => {
  const { pollObj } = props;
  const {
    publishedAt,
    pollId,
    type,
    questionText,
    responses,
    multipleResponses,
    secret,
    ended
  } = pollObj;

  const { t } = useTranslation();
  const dispatch = useDispatch();

  const noPollLocale = type === 'CUSTOM' || type === 'R-';
  const isReceivingAnswers = !ended;
  const timestamp = new Date(publishedAt);

  const [mappedObject, setMappedObject] = useState({});
  const [showUsersAnswers, setShowUsersAnswers] = useState(false);

  const renderAnswers = () => (
    responses.map((response) => (
      <View key={response.optionId}>
        <Styled.AnswerContainer>
          <Styled.LabelContainer>
            <Styled.PercentageText numberOfLines={1}>
              {(response.optionResponsesCount === 0
                ? 0
                : (response.optionResponsesCount / response.pollResponsesCount) * 100).toFixed(0)}
              %
            </Styled.PercentageText>
            <Styled.KeyText>
              {noPollLocale ? response.optionDesc : t(`app.poll.answer.${response.optionDesc}`.toLowerCase())}
            </Styled.KeyText>
          </Styled.LabelContainer>
          <ActivityBar
            width={`${response.optionResponsesCount === 0
              ? 0
              : (((response.optionResponsesCount / response.pollResponsesCount) * 100).toFixed(0))}%`}
          />
        </Styled.AnswerContainer>
      </View>
    ))
  );

  const renderBottomSideOfCard = () => {
    if (!isReceivingAnswers) {
      return (
        <Styled.PollInfoLabelContainer>
          <Styled.PollInfoText>
            {`${String(timestamp.getHours()).padStart(2, '0')}:${String(
              timestamp.getMinutes()
            ).padStart(2, '0')}`}
          </Styled.PollInfoText>
        </Styled.PollInfoLabelContainer>
      );
    }

    return (
      <>
        <Styled.PollInfoLabelContainer>
          <Styled.PollInfoText>
            {
          `${pollObj.numResponders ?? 0} / ${pollObj.numRespondents ?? 0}`
          }
          </Styled.PollInfoText>
          <Styled.PresenterContainerOptions>
            <Styled.PressableMinimizeAnswersText
              secretPoll={pollObj.secretPoll}
              showUsersAnswers={showUsersAnswers}
              anonLabel={t('mobileSdk.poll.createPoll.anonymous')}
              onPress={() => setShowUsersAnswers((prevValue) => !prevValue)}
            >
              {showUsersAnswers ? t('mobileSdk.poll.createPoll.minimize') : t('mobileSdk.poll.createPoll.maximize')}
            </Styled.PressableMinimizeAnswersText>
            <Styled.DeleteIcon onPress={() => PollService.handleStopPoll()} />
          </Styled.PresenterContainerOptions>
        </Styled.PollInfoLabelContainer>
        {showUsersAnswers && renderUsersAnswers()}
      </>
    );
  };

  return (
    <View>
      <Styled.ContainerPollCard onPress={() => dispatch(trigDetailedInfo())}>
        <Styled.QuestionText>
          {questionText === '' || !questionText
            ? t('mobileSdk.poll.noQuestionTextProvided')
            : questionText}
        </Styled.QuestionText>
        {renderAnswers()}
        <Styled.CustomDivider />
        {renderBottomSideOfCard()}
        <Styled.BlankSpaceForButton />
      </Styled.ContainerPollCard>
      <Styled.PressableButton
        disabled={!isReceivingAnswers}
        onPress={() => {
          PollService.handlePublishPoll();
          PollService.handleStopPoll();
        }}
      >
        {isReceivingAnswers ? t('mobileSdk.poll.createPoll.publish') : t('mobileSdk.poll.previousPolls.publishedLabel')}
      </Styled.PressableButton>
    </View>
  );
};

export default PreviousPollCard;
