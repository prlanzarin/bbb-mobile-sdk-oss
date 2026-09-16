import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Profiles that stay on screen until their underlying condition clears. They
// are the only ones offered a dismiss control, since the user would otherwise
// have no way to get rid of them.
export const PERSISTENT_PROFILES = ['mediaReconnectFailed', 'mediaReconnecting'];

const initialState = {
  isShow: false,
  profile: '',
  extraInfo: {},
  text: '',
  // Per-profile latch: a dismissed profile must not be put back on screen
  // until its condition clears and arms it again.
  dismissed: {},
  // Notice a timed toast took the single slot from, pending restoration.
  displaced: null,
};

const notificationBarSlice = createSlice({
  name: 'notificationBar',
  initialState,
  reducers: {
    show: (state) => {
      state.isShow = true;
    },
    hide: (state) => {
      state.isShow = false;
    },
    hideNotification: (state, action) => {
      // Re-arm the latch even when another profile holds the slot: hiding a
      // profile means its condition is gone, and a later occurrence of it is a
      // new one the user has not dismissed.
      if (action.payload) delete state.dismissed[action.payload];

      // A hide aimed at the displaced notice - or a blanket one - drops the
      // pending restoration: the condition behind it is gone.
      if (!action.payload || state.displaced?.profile === action.payload) {
        state.displaced = null;
      }

      if (!action.payload || action.payload === state.profile) {
        state.isShow = false;
        state.profile = '';
        state.extraInfo = {};
      }
    },
    dismissNotification: (state, action) => {
      const profile = action.payload || state.profile;

      if (!profile) return;

      state.dismissed[profile] = true;

      if (profile === state.profile) {
        state.isShow = false;
        state.profile = '';
        state.extraInfo = {};
      }
    },

    // Hand the slot back to the notice a timed toast borrowed it from, once
    // the toast is over.
    restoreNotification: (state) => {
      const { profile, text, extraInfo } = state.displaced || {};

      state.displaced = null;

      // Nothing to restore, somebody else owns the slot now, or the notice was
      // dismissed while the toast was up.
      if (!profile || state.profile || state.dismissed[profile]) return;

      state.isShow = true;
      state.profile = profile;
      state.text = text;
      state.extraInfo = extraInfo;
    },

    // notification profiles
    setProfile: (state, action) => {
      // Timed toasts are the only ones that give the slot back, so a notice
      // they replace is remembered instead of lost - it has no timer of its
      // own and nothing else would raise it again.
      if (action.payload.timed
        && state.profile
        && state.profile !== action.payload.profile) {
        state.displaced = {
          profile: state.profile,
          text: state.text,
          extraInfo: { ...state.extraInfo },
        };
      }

      switch (action.payload.profile) {
        case 'handsUp':
          state.isShow = true;
          state.profile = 'handsUp';
          state.text = 'mobileSdk.notificationBar.handsUp';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'cameraToggle':
          state.isShow = true;
          state.profile = 'cameraToggle';
          state.text = 'mobileSdk.notificationBar.cameraToggle';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'mediaReconnecting':
          state.isShow = true;
          state.profile = 'mediaReconnecting';
          state.text = 'mobileSdk.notificationBar.mediaReconnecting';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'mediaReconnectFailed':
          state.isShow = true;
          state.profile = 'mediaReconnectFailed';
          state.text = 'mobileSdk.notificationBar.mediaReconnectFailed';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'cameraStopped':
          state.isShow = true;
          state.profile = 'cameraStopped';
          state.text = 'app.video.mediaTimedOutError';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'cameraStoppedByLock':
          state.isShow = true;
          state.profile = 'cameraStoppedByLock';
          state.text = 'app.video.ejectedByLockSettings';
          state.extraInfo = action.payload.extraInfo;
          break;
        case 'recordingStarted':
          state.isShow = true;
          state.profile = 'recordingStarted';
          state.text = 'app.notification.recordingStart';
          state.extraInfo = {};
          break;
        case 'recordingStopped':
          state.isShow = true;
          state.profile = 'recordingStopped';
          state.text = 'app.notification.recordingPaused';
          state.extraInfo = {};
          break;
        default:
      }
    }
  },
});

const notificationQueue = [];
export const showNotificationWithTimeout = createAsyncThunk(
  'notificationBar/setProfile',
  async (params, thunkAPI) => {
    // Callers pass either a profile string or a { profile } object. Normalise,
    // and never write back into the caller's argument: a string primitive
    // throws in strict mode, which used to leave the queue jammed for good.
    const requested = typeof params === 'string' ? params : params?.profile;

    if (!requested) return;

    notificationQueue.push(requested);
    // Somebody else owns the drain loop.
    if (notificationQueue.length > 1) return;

    try {
      while (notificationQueue.length !== 0) {
        const profile = notificationQueue[0];

        thunkAPI.dispatch(setProfile({ profile, timed: true }));
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, 5000));
        notificationQueue.shift();
        thunkAPI.dispatch(hideNotification(profile));
      }
    } finally {
      // A throw must never leave a stuck head behind: every later call would
      // take the "already draining" path and never be shown again.
      notificationQueue.length = 0;
      // Nothing is queued behind this drain, so the slot goes back to whoever
      // held it before the first toast.
      thunkAPI.dispatch(restoreNotification());
    }
  }
);

export const cancelQueuedNotification = (profile) => {
  // Entry 0 is the one the drain loop is showing and will shift itself;
  // removing it here would make the loop drop somebody else's notification.
  for (let i = notificationQueue.length - 1; i > 0; i -= 1) {
    if (notificationQueue[i] === profile) notificationQueue.splice(i, 1);
  }
};

export const {
  show,
  hide,
  setProfile,
  hideNotification,
  dismissNotification,
  restoreNotification,
} = notificationBarSlice.actions;
export default notificationBarSlice.reducer;
