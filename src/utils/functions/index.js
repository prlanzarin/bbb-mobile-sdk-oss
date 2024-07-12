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

const arraysEqual = (a1, a2) => {
  // eslint-disable-next-line eqeqeq
  return JSON.stringify(a1) == JSON.stringify(a2);
};

const parseQueryString = (url) => {
  const queryString = url.split('?')[1];
  if (!queryString) {
    return {};
  }

  const params = {};
  const keyValuePairs = queryString.split('&');

  keyValuePairs.forEach((pair) => {
    const [key, value] = pair.split('=');
    params[key] = decodeURIComponent(value || '');
  });

  return params;
};

const getHostFromUrl = (url) => {
  const regex = /^(?:[^:\n]+:\/\/)?([^:#/\n]*)/;
  const match = url.match(regex);
  const host = match ? match[1] : null;
  return host;
};

function xml2json(xmlString) {
  const responseRegex = /<response>([\s\S]*?)<\/response>/;
  const elementRegex = /<([a-zA-Z0-9_-]+)>([\s\S]*?)<\/\1>/g;

  const responseMatch = responseRegex.exec(xmlString);
  if (responseMatch) {
    const responseData = responseMatch[1];

    let match;
    const result = {};

    // eslint-disable-next-line no-cond-assign
    while ((match = elementRegex.exec(responseData)) !== null) {
      const elementName = match[1];
      const elementValue = match[2].trim();

      if (result[elementName] === undefined) {
        result[elementName] = [];
      }

      result[elementName] = elementValue;
    }

    return result;
  }
  console.error('No <response> tag found in XML');
}

export default {
  humanizeSeconds,
  arraysEqual,
  parseQueryString,
  getHostFromUrl,
  xml2json
};
