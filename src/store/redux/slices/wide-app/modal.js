import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isShow: false,
  extraInfo: {},
  titleText: '',
  contentText: '',
  profile: ''
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    show: (state) => {
      state.isShow = true;
    },
    hide: (state) => {
      state.isShow = false;
      state.profile = null;
      state.extraInfo = null;
    },
    setProfile: (state, action) => {
      state.profile = action.payload.profile;
      state.extraInfo = action.payload.extraInfo;
      state.isShow = true;
    }
  }
});

export const {
  show,
  hide,
  setProfile,
} = modalSlice.actions;
export default modalSlice.reducer;
