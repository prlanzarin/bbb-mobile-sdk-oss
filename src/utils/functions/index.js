const humanizeSeconds = (time) => {
  if (!time) {
    return '00:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return [
    minutes,
    seconds,
  ].map((x) => {
    if (x < 10) {
      return `0${x}`;
    }
    return x;
  },).join(':');
};

const arraysEqual = (a1,a2) => {
  return JSON.stringify(a1)==JSON.stringify(a2);
}

export default {
  humanizeSeconds,
  arraysEqual
};
