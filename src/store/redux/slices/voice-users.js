import { createSlice, createSelector } from '@reduxjs/toolkit';
import AudioManager from '../../../services/webrtc/audio-manager';

const voiceUsersSlice = createSlice({
  name: 'voiceUsers',
  initialState: {
    voiceUsersCollection: {},
    userIdMatchDocumentId: {},
    ready: false,
  },
  reducers: {
    addVoiceUser: (state, action) => {
      const { voiceUserObject } = action.payload;
      state.voiceUsersCollection[voiceUserObject.id] = voiceUserObject.fields;
      state.userIdMatchDocumentId[voiceUserObject.fields.intId] = voiceUserObject.id;
    },
    removeVoiceUser: (state, action) => {
      const { voiceUserObject } = action.payload;
      const userId = selectUserIdByDocumentId(voiceUserObject.id);
      if (userId) delete state.userIdMatchDocumentId[userId];
      delete state.voiceUsersCollection[voiceUserObject.id];
    },
    editVoiceUser: (state, action) => {
      const { voiceUserObject } = action.payload;
      state.voiceUsersCollection[voiceUserObject.id] = {
        ...state.voiceUsersCollection[voiceUserObject.id],
        ...voiceUserObject.fields,
      };
    },
    readyStateChanged: (state, action) => {
      state.ready = action.payload;
    },
    cleanupStaleData: (state, action) => {
      const currentSubscriptionId = action.payload;
      if (state?.voiceUsersCollection) {
        Object.entries(state?.voiceUsersCollection)
          .forEach(([id, document]) => {
            const { subscriptionId } = document;

            if (typeof subscriptionId !== 'string') return;

            if (subscriptionId !== currentSubscriptionId) {
              delete state.voiceUsersCollection[id];
            }
          });
      }
    },
  },
});

// Selectors
const selectVoiceUserByDocumentId = (state, documentId) => {
  if (state?.voiceUsersCollection?.voiceUsersCollection == null) return null;
  return state.voiceUsersCollection.voiceUsersCollection[documentId];
};

const selectVoiceUserByUserId = (state, userId) => {
  if (state?.voiceUsersCollection?.voiceUsersCollection == null) return null;
  const documentId = state.voiceUsersCollection.userIdMatchDocumentId[userId];
  return state.voiceUsersCollection.voiceUsersCollection[documentId];
};

const selectUserIdByDocumentId = (state, documentId) => {
  return selectVoiceUserByDocumentId(state, documentId)?.intId;
};

const isTalkingByUserId = createSelector(
  (state, userId) => selectVoiceUserByUserId(state, userId),
  (voiceUserObj) => voiceUserObj?.talking
);

// Middleware effects and listeners
const voiceStateChangePredicate = (action, currentState) => {
  if (!editVoiceUser.match(action) && !addVoiceUser.match(action)) return false;
  const { voiceUserObject } = action.payload;
  const currentVoiceUser = selectVoiceUserByDocumentId(currentState, voiceUserObject.id);
  // Not for us - skip
  if (currentVoiceUser.intId !== AudioManager.userId) return false;
  return true;
};

const voiceStateChangeListener = (action, listenerApi) => {
  const state = listenerApi.getState();
  const { voiceUserObject } = action.payload;
  const currentVoiceUser = selectVoiceUserByDocumentId(state, voiceUserObject.id);
  const { muted } = currentVoiceUser;

  if (typeof muted === 'boolean' && muted !== state.audio.isMuted) {
    AudioManager.setMutedState(muted);
  }
};

export const {
  addVoiceUser,
  removeVoiceUser,
  editVoiceUser,
  readyStateChanged,
  cleanupStaleData,
} = voiceUsersSlice.actions;

export {
  selectVoiceUserByDocumentId,
  selectVoiceUserByUserId,
  voiceStateChangeListener,
  voiceStateChangePredicate,
  isTalkingByUserId,
};

export default voiceUsersSlice.reducer;
