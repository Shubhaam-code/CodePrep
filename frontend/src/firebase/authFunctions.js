import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from './config';

/**
 * Initiates Firebase Google Sign-In using popup window.
 * Falls back to redirect sign-in if the popup is blocked, cancelled, or closed.
 * @returns {Promise<User|null>} - Firebase User object or null if redirecting
 */
export const signInWithGoogle = async () => {
  try {
    // Force prompt accounts selection
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn('Firebase Google Sign-In popup failed. Trying redirect fallback.', error);
    
    // Check if the popup was blocked, closed, or cancelled
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    
    throw error;
  }
};

/**
 * Handles the redirect result after coming back to the application.
 * @returns {Promise<User|null>} - Firebase User object or null
 */
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.error('Firebase redirect sign-in error:', error);
    throw error;
  }
};

/**
 * Initiates Firebase Sign-Out.
 */
export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Sign-Out error:', error);
    throw error;
  }
};
