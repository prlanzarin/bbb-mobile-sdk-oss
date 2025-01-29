import { createSlice, createSelector } from '@reduxjs/toolkit';

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
  isTalkingByUserId,
};

export default voiceUsersSlice.reducer;
