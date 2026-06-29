
console.log("CONTENT SCRIPT LOADED");
console.log("runtime:", chrome.runtime);

console.log("runtime id:", chrome.runtime?.id);


console.log("sendMessage:", typeof chrome.runtime?.sendMessage);
console.log("[CodePrep Extension] contentCodePrep.js loaded");

console.log("[CodePrep Extension] Current URL:", location.href);
document.documentElement.setAttribute("data-extension-installed", "true");
console.log("[CodePrep Extension] Extension marker injected");

// contentCodePrep.js - Injected into the CodePrep website (localhost)
(function () {
  let lastToken = localStorage.getItem('token');

  /**
   * Safely dispatches a message to the background service worker.
   * Protects against "Extension context invalidated" errors and handles callback errors.
   *
   * @param {Object} message - The message payload to send.
   * @param {Function} [callback] - Optional response callback.
   * @returns {boolean} - Returns true if the message was successfully dispatched, false otherwise.
   */
  function safeSendMessage(message, callback) {
    // 1. Check if the top-level chrome object and runtime API exist.
    // This prevents errors if the script is run in contexts where chrome APIs are stripped.
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn("[CodePrep Extension] chrome.runtime is not available.");
      if (callback) {
        try {
          callback(null);
        } catch (e) {
          console.error("[CodePrep Extension] Error in callback:", e);
        }
      }
      return false;
    }

    // 2. Check if chrome.runtime.id exists.
    // If the extension context is invalidated (due to an update or reload),
    // accessing or using runtime APIs will throw. Checking .id detects this state.
    if (!chrome.runtime.id) {
      console.warn("[CodePrep Extension] chrome.runtime.id is missing. Context is invalidated.");
      if (callback) {
        try {
          callback(null);
        } catch (e) {
          console.error("[CodePrep Extension] Error in callback:", e);
        }
      }
      return false;
    }

    try {
      // 3. Wrap the sendMessage call in a try/catch block to catch synchronous invalid context exceptions.
      chrome.runtime.sendMessage(message, (response) => {
        // 4. Handle chrome.runtime.lastError. If lastError is set and not checked,
        // it throws an uncaught exception.
        if (chrome.runtime.lastError) {
          console.warn(
            "[CodePrep Extension] Message dispatch failed:",
            chrome.runtime.lastError.message
          );
          if (callback) {
            try {
              callback(null);
            } catch (e) {
              console.error("[CodePrep Extension] Error in callback:", e);
            }
          }
          return;
        }

        if (callback) {
          try {
            callback(response);
          } catch (e) {
            console.error("[CodePrep Extension] Error in callback:", e);
          }
        }
      });
      return true;
    } catch (err) {
      // 5. Gracefully catch synchronous invalid context errors.
      console.warn("[CodePrep Extension] Context invalidated during sendMessage:", err.message);
      if (callback) {
        try {
          callback(null);
        } catch (e) {
          console.error("[CodePrep Extension] Error in callback:", e);
        }
      }
      return false;
    }
  }

  // Sync token on script load
  safeSendMessage({ action: "storeToken", token: lastToken || null });

  // Set up storage listener to sync dynamically (handles login and logout)
  window.addEventListener('storage', (event) => {
    if (event.key === 'token') {
      const newToken = event.newValue;
      if (newToken !== lastToken) {
        lastToken = newToken;
        safeSendMessage({ action: "storeToken", token: lastToken || null });
      }
    }
  });

  // Polling fallback: check every 5 seconds
  setInterval(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken !== lastToken) {
      lastToken = currentToken;
      safeSendMessage({ action: "storeToken", token: lastToken || null });
    }
  }, 5000);

  // Handshake listener: listen for CODEPREP_PING and reply with CODEPREP_PONG.
  // PING is routed through the background service worker so we can confirm
  // that both the content script AND the background worker are alive.
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CODEPREP_PING') {
      const sent = safeSendMessage({ action: "pingExtension" }, (response) => {
        if (response && response.installed) {
          window.postMessage({
            type: 'CODEPREP_PONG',
            installed: true,
            version: response.version
          }, '*');
        } else {
          // Handshake failed or background unresponsive
          window.postMessage({
            type: 'CODEPREP_PONG',
            installed: false
          }, '*');
        }
      });

      // If the message was not sent (e.g. invalid context)
      if (!sent) {
        window.postMessage({
          type: 'CODEPREP_PONG',
          installed: false
        }, '*');
      }
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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        // Defensive check: Ensure context remains valid during runtime listener fires.
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
          return;
        }
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
    }
  } catch (e) {
    console.warn("[CodePrep Extension] chrome.storage.onChanged unavailable:", e);
  }

  // Register listener for browser connection/auth requests from the background worker.
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Defensive check: Ensure context remains valid when incoming messages arrive.
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
          return false;
        }
        if (request.action === "getTokenFromBrowser") {
          sendResponse({ token: localStorage.getItem('token') || null });
        }
        return true;
      });
    }
  } catch (e) {
    console.warn("[CodePrep Extension] chrome.runtime.onMessage unavailable:", e);
  }
})();

