const isAnyOptionChecked = (optionsStatus) => {
  return Object.values(optionsStatus).some((value) => {
    return value;
  });
};

const setMessageText = (problemDetalied, text) => {
  problemDetalied.text = text;
};

const parseEndReason = (endReason) => {
  switch (endReason) {
    case 'loggedOut':
      return 'app.feedback.title';
    case 'kicked':
      return 'app.error.403';
    case 'meetingEnded':
      return 'app.guest.meetingEnded';
    default:
      return 'mobileSdk.error.fallback';
  }
};

export default {
  isAnyOptionChecked,
  setMessageText,
  parseEndReason
};
