console.log("[CodePrep Extension] contentCodePrep.js loaded");
console.log("[CodePrep Extension] Current URL:", location.href);
document.documentElement.setAttribute("data-extension-installed", "true");
console.log("[CodePrep Extension] Extension marker injected");

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

  // Handshake listener: listen for CODEPREP_PING and reply with CODEPREP_PONG
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'CODEPREP_PING') {
      window.postMessage({ type: 'CODEPREP_PONG' }, '*');
    }
  });
})();

