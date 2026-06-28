import apiClient from '../api/axios';
import { setUser } from '../store/authSlice';

export function openGitHubOAuthPopup({
  dispatch,
  queryClient,
  onSuccess,
  onError,
  onClosed,
} = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const apiOrigin = new URL(baseUrl, window.location.origin).origin;
  const token = localStorage.getItem('token');

  if (!token) {
    onError?.('You must be signed in before connecting GitHub.');
    return null;
  }

  const connectUrl = `${baseUrl}/api/auth/github?token=${encodeURIComponent(token)}`;
  const popup = window.open(connectUrl, 'GitHub Connect', 'width=600,height=700');

  if (!popup) {
    onError?.('Popup blocked. Allow popups for this site and try again.');
    return null;
  }

  const openedAt = Date.now();
  let settled = false;

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorage);
    try {
      oauthChannel.close();
    } catch (e) {}
  };

  const refreshUser = async () => {
    const profileRes = await apiClient.get('/api/auth/me');
    if (profileRes?.data && dispatch) {
      dispatch(setUser(profileRes.data));
    }
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['githubStats'] });
      queryClient.invalidateQueries({ queryKey: ['githubProfileStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
    return profileRes.data;
  };

  const handleOAuthResult = async (data) => {
    if (settled) return;
    settled = true;
    cleanup();

    if (data.type === 'oauth-error' || data.success === false) {
      onError?.(data.message || 'GitHub authorization was cancelled.');
      return;
    }

    try {
      await refreshUser();
      onSuccess?.(data);
    } catch (err) {
      console.error('[GitHub OAuth] Failed to refresh authenticated user:', err);
      onError?.('GitHub connected, but the app could not refresh your profile. Please try again.');
    }
  };

  // 1. Message listener (postMessage - fallback if window.opener is somehow preserved)
  function handleMessage(event) {
    if (event.origin !== window.location.origin && event.origin !== apiOrigin) return;
    if (event.data?.provider !== 'github') return;
    if (event.data?.type !== 'oauth-success' && event.data?.type !== 'oauth-error') return;

    handleOAuthResult(event.data);
  }

  // 2. BroadcastChannel listener (primary modern same-origin communication)
  const oauthChannel = new BroadcastChannel('github-oauth-channel');
  oauthChannel.onmessage = (event) => {
    if (event.data?.provider !== 'github') return;
    handleOAuthResult(event.data);
  };

  // 3. LocalStorage storage listener (secondary same-origin communication fallback)
  function handleStorage(event) {
    if (event.key !== 'github-oauth-result') return;
    try {
      const data = JSON.parse(event.newValue);
      if (data && data.provider === 'github') {
        // Clear the item so we don't re-process it next time
        localStorage.removeItem('github-oauth-result');
        handleOAuthResult(data);
      }
    } catch (e) {
      console.error('[GitHub OAuth] Failed to parse storage event data:', e);
    }
  }

  // 4. Focus/Visibility fallback check (for manual close detection)
  const performFocusCheck = () => {
    if (settled) return;
    if (Date.now() - openedAt < 2000) return; // Ignore premature focus events during popup initialization

    // Wait a brief moment to let BroadcastChannel / Storage events fire first
    setTimeout(async () => {
      if (settled) return;

      // Check user profile connection status directly from backend
      try {
        const data = await refreshUser();
        if (data?.githubConnected) {
          handleOAuthResult({
            provider: 'github',
            type: 'oauth-success',
            success: true,
            githubUsername: data.githubUsername,
            githubProfileUrl: data.githubProfileUrl,
          });
          return;
        }
      } catch (err) {
        console.error('[GitHub OAuth] Focus fallback check failed:', err);
      }

      // If still not settled and not connected, the user closed the popup or navigated away
      settled = true;
      cleanup();
      onClosed?.();
    }, 800);
  };

  function handleFocus() {
    performFocusCheck();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      performFocusCheck();
    }
  }

  // Setup periodic check in case popup was closed within 2 seconds of open and main window stayed focused
  setTimeout(() => {
    if (!settled && document.hasFocus()) {
      performFocusCheck();
    }
  }, 2200);

  window.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return popup;
}
