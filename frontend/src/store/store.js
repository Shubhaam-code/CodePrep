import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// Expose standard custom hooks for dispatch and selector consistency
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
