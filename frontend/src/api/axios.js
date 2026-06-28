import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/authSlice';
import { API_BASE_URL } from '../config';

// Create an Axios instance with base URL from centralized configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach JWT token to Authorization headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle authentication failures
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 ||
        (error.response.status === 404 && error.config && error.config.url && error.config.url.endsWith('/api/auth/me')))
    ) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default apiClient;
