// contentCodePrep.js - Injected into the CodePrep website (localhost)
(function() {
  let lastToken = localStorage.getItem('token');

  // Sync token on script load
  chrome.runtime.sendMessage({ action: "storeToken", token: lastToken || null });

  // Set up storage listener to sync dynamically (handles login and logout)
  window.addEventListener('storage', (event) => {
    if (event.key === 'token') {
      const newToken = event.newValue;
      if (newToken !== lastToken) {
        lastToken = newToken;
        chrome.runtime.sendMessage({ action: "storeToken", token: lastToken || null });
      }
    }
  });

  // Polling fallback: check every 5 seconds
  setInterval(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken !== lastToken) {
      lastToken = currentToken;
      chrome.runtime.sendMessage({ action: "storeToken", token: lastToken || null });
    }
  }, 5000);
})();

