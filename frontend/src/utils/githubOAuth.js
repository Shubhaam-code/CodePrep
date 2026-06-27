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

  let settled = false;
  let closeTimer;

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    if (closeTimer) clearInterval(closeTimer);
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

  async function handleMessage(event) {
    if (event.origin !== window.location.origin && event.origin !== apiOrigin) return;
    if (event.data?.provider !== 'github') return;
    if (event.data?.type !== 'oauth-success' && event.data?.type !== 'oauth-error') return;

    settled = true;
    cleanup();

    if (event.data.type === 'oauth-error' || event.data.success === false) {
      onError?.(event.data.message || 'GitHub authorization was cancelled.');
      if (popup && !popup.closed) popup.close();
      return;
    }

    try {
      await refreshUser();
      onSuccess?.(event.data);
    } catch (err) {
      console.error('[GitHub OAuth] Failed to refresh authenticated user:', err);
      onError?.('GitHub connected, but the app could not refresh your profile. Please try again.');
    } finally {
      if (popup && !popup.closed) popup.close();
    }
  }

  window.addEventListener('message', handleMessage);

  closeTimer = setInterval(() => {
    if (!popup.closed) return;
    cleanup();
    if (settled) return;

    // Popup closed without receiving a postMessage.
    // The OAuth may have succeeded on the backend but the popup's
    // window.opener was severed (e.g. GitHub's COOP headers) so the
    // postMessage never arrived.  Check the backend directly.
    settled = true;

    const checkUserState = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const data = await refreshUser();
          if (data?.githubConnected) {
            onSuccess?.({
              githubUsername: data.githubUsername,
              githubProfileUrl: data.githubProfileUrl,
            });
            return;
          }
        } catch (err) {
          console.error('[GitHub OAuth] Fallback user check failed:', err);
        }
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      onClosed?.();
    };

    checkUserState();
  }, 500);

  return popup;
}
