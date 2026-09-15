// Cameras this client asked to stop. A stop that is not in here came from the
// server (ejection, lock settings) or from the transport, and is the only kind
// the user has to be told about.
const expectedStreamStops = new Set<string>();

// The ids that a session teardown stops are not known up front - and by the
// time the server rows disappear the local publications are gone too - so the
// whole teardown is covered by a latch instead.
let allStreamStopsExpected = false;

export const expectStreamStop = (stream: string): void => {
  expectedStreamStops.add(stream);
};

export const expectAllStreamStops = (): void => {
  allStreamStopsExpected = true;
};

export const clearExpectedStreamStops = (): void => {
  allStreamStopsExpected = false;
  expectedStreamStops.clear();
};

/**
 * Whether `stream` was stopped on this client's request, consuming the
 * expectation.
 *
 * The entry is dropped even while the teardown latch answers for it, so a
 * marking left behind by a teardown cannot swallow an unexpected stop of a
 * camera published in the next session.
 */
export const consumeExpectedStreamStop = (stream: string): boolean => {
  const expected = expectedStreamStops.delete(stream);

  return allStreamStopsExpected || expected;
};
