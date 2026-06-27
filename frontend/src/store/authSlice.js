import { createSlice } from '@reduxjs/toolkit';

// Only the auth token is persisted to localStorage. Solved state (and the
// rest of the user document) is NOT cached here — `user.solvedQuestions` from
// the backend is the single source of truth. Pages call `GET /api/auth/me`
// on mount and dispatch `setUser` so they always reflect the latest DB state.
const token = localStorage.getItem('token');

const initialState = {
  user: null,
  token: token || null,
  isAuthenticated: false, // Never assume logged in on startup
  isAuthLoading: !!token, // True if we need to verify a token on startup
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
      state.isAuthLoading = false;
      localStorage.setItem('token', token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isAuthLoading = false;
      localStorage.clear();
      sessionStorage.clear();
      // Clear cookies if they exist
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        state.isAuthenticated = true;
      } else {
        state.isAuthenticated = false;
      }
      state.isAuthLoading = false;
    },
    updateBookmarks: (state, action) => {
      if (state.user) {
        state.user.bookmarks = action.payload;
      }
    },
  },
});

export const { loginSuccess, logout, setUser, updateBookmarks } = authSlice.actions;
export default authSlice.reducer;