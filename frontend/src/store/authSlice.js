import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
let user = null;

if (userStr) {
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    console.error('Failed to parse cached user:', e);
  }
}

const initialState = {
  user,
  token: token || null,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    updateSolvedQuestions: (state, action) => {
      if (state.user) {
        state.user.solvedQuestions = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateBookmarks: (state, action) => {
      if (state.user) {
        state.user.bookmarks = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const { loginSuccess, logout, setUser, updateSolvedQuestions, updateBookmarks } = authSlice.actions;
export default authSlice.reducer;
