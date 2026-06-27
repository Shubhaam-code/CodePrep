console.log("CONTENT SCRIPT LOADED");
console.log("runtime:", chrome.runtime);

console.log("runtime id:", chrome.runtime?.id);


console.log("sendMessage:", typeof chrome.runtime?.sendMessage);
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
  // PING is routed through the background service worker so we can confirm
  // that both the content script AND the background worker are alive.
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CODEPREP_PING') {
      chrome.runtime.sendMessage({ action: "pingExtension" }, (response) => {
        if (response && response.installed) {
          window.postMessage({
            type: 'CODEPREP_PONG',
            installed: true,
            version: response.version
          }, '*');
        }
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // Sync-completion bridge
  //
  // background.js writes `contexts.<ctx>.syncState = "synced"` to
  // chrome.storage.local after a successful /api/extension/sync call.
  // The website's open tab has no direct way to notice that — the
  // background service worker runs in a separate context. We watch
  // chrome.storage.onChanged (event-driven, no polling) and, whenever a
  // problem transitions to "synced", broadcast a BroadcastChannel
  // message on the page. The Dashboard listens on the same channel and
  // refreshes Redux via /api/auth/me so the solved indicator updates
  // instantly without navigating away.
  // ─────────────────────────────────────────────────────────────────────
  let codeprepSyncChannel = null;
  try {
    codeprepSyncChannel = new BroadcastChannel('codeprep-sync');
  } catch (e) {
    console.warn("[CodePrep Extension] BroadcastChannel unavailable:", e);
  }

  const isSyncedTransition = (oldVal, newVal) => {
    const wasSynced = oldVal && oldVal.contexts && Object.values(oldVal.contexts)
      .some((c) => c && c.syncState === 'synced');
    if (wasSynced) return false; // already synced — ignore
    if (!newVal || !newVal.contexts) return false;
    return Object.values(newVal.contexts).some((c) => c && c.syncState === 'synced');
  };

  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes || !codeprepSyncChannel) return;
      for (const key of Object.keys(changes)) {
        if (!key.startsWith('leetcode_problem_')) continue;
        const change = changes[key];
        if (isSyncedTransition(change.oldValue, change.newValue)) {
          try {
            codeprepSyncChannel.postMessage({
              type: 'codeprep:sync-completed',
              problemKey: key,
              timestamp: new Date().toISOString(),
            });
            console.log("[CodePrep Extension] Broadcast sync-completed for", key);
          } catch (err) {
            console.warn("[CodePrep Extension] BroadcastChannel post failed:", err);
          }
        }
      }
    });
  } catch (e) {
    console.warn("[CodePrep Extension] chrome.storage.onChanged unavailable:", e);
  }
})();

