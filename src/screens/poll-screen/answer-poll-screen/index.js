import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSubscription, useMutation } from '@apollo/client';
import ScreenWrapper from '../../../components/screen-wrapper';
import Styled from './styles';
import queries from '../queries';

const AnswerPollScreen = () => {
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const { data: pollData } = useSubscription(queries.POLL_ACTIVE_SUBSCRIPTION);
  const activePollObject = pollData?.poll[0];
  const scrollViewRef = useRef();
  const { t } = useTranslation();
  const [pollSubmitUserTypedVote] = useMutation(queries.POLL_SUBMIT_TYPED_VOTE);
  const [pollSubmitUserVote] = useMutation(queries.POLL_SUBMIT_VOTE);

  const handleTypedVote = (pollId, answer) => {
    pollSubmitUserTypedVote({
      variables: {
        pollId,
        answer,
      },
    });
  };

  const handleVote = (pollId, answerIds) => {
    pollSubmitUserVote({
      variables: {
        pollId,
        answerIds,
      },
    });
  };

  const handleSelectAnswers = (id) => {
    // If is custom input
    if (activePollObject?.type === 'R-') {
      return setSelectedAnswers([id.toString()]);
    }
    // If is multiple response
    if (activePollObject?.multipleResponses) {
      let updatedList = [...selectedAnswers];
      if (!updatedList.includes(id)) {
        updatedList = [...selectedAnswers, id];
      } else {
        updatedList.splice(selectedAnswers.indexOf(id), 1);
      }
      return setSelectedAnswers(updatedList);
    }
    // If is single response
    return setSelectedAnswers([id]);
  };

  const handleSecretPollLabel = () => (
    <Styled.SecretLabel>
      {activePollObject?.secret
        ? t('app.polling.responseSecret')
        : t('app.polling.responseNotSecret')}
    </Styled.SecretLabel>
  );

  const handleIsMultipleResponseLabel = () => (
    <Styled.SecretLabel>
      {activePollObject?.multipleResponses
        ? t('mobileSdk.poll.multipleChoice')
        : t('mobileSdk.poll.oneAnswer')}
    </Styled.SecretLabel>
  );

  const handleTypeOfAnswer = () => {
    const noPollLocale = activePollObject?.type === 'CUSTOM' || activePollObject?.type === 'R-';

    // 'R-' === custom input
    if (activePollObject?.type === 'R-') {
      return (
        <Styled.TextInput
          label={t('app.questions.modal.answerLabel')}
          onChangeText={(text) => setSelectedAnswers(text)}
        />
      );
    }
    return activePollObject?.options?.map((option) => (
      <Styled.OptionsButton
        key={option.optionId}
        selected={selectedAnswers.includes(option.optionId)}
        onPress={() => {
          handleSelectAnswers(option.optionId);
        }}
      >
        {noPollLocale ? option?.optionDesc : t(`app.poll.answer.${option.optionDesc}`.toLowerCase())}
      </Styled.OptionsButton>
    ));
  };

  const renderMethod = () => (
    <>
      <Styled.Title>{activePollObject?.questionText}</Styled.Title>
      {handleSecretPollLabel()}
      {handleIsMultipleResponseLabel()}
      <Styled.ButtonsContainer>{handleTypeOfAnswer()}</Styled.ButtonsContainer>

      <Styled.ConfirmButton
        onPress={() => {
          if (activePollObject?.type === 'R-') {
            handleTypedVote(
              activePollObject.pollId,
              selectedAnswers
            );
            return;
          }
          handleVote(
            activePollObject.pollId,
            selectedAnswers
          );
        }}
      >
        {t('mobileSdk.poll.sendAnswer')}
      </Styled.ConfirmButton>
    </>
  );

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Styled.ContainerPollCard
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
        >
          <Styled.ContainerViewPadding>
            {renderMethod()}
          </Styled.ContainerViewPadding>
        </Styled.ContainerPollCard>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default AnswerPollScreen;
