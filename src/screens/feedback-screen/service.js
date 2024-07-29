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
    default:
      return 'mobileSdk.error.fallback';
  }
};

export default {
  isAnyOptionChecked,
  setMessageText,
  parseEndReason
};
