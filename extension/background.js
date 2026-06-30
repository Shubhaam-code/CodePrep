// background.js - Service Worker for LeetCode Tracker Companion
importScripts('config.js');


// Extensibility: Placeholder for handling messages between the content script,
// popup, and the local backend server (e.g. syncing submissions or authenticating).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background service worker:", request);

  if (request.action === "getBackgroundStatus") {
    sendResponse({ status: "active", version: "1.0.0" });
    return;
  }

  if (request.action === "pingExtension") {
    sendResponse({
      installed: true,
      version: chrome.runtime.getManifest().version
    });
    return;
  }

  if (request.action === "storeToken") {
    if (request.token) {
      chrome.storage.local.set({ token: request.token }, () => {
        console.log("JWT token stored in chrome.storage.local.");
        sendResponse({ success: true });
      });
    } else {
      chrome.storage.local.remove(["token"], () => {
        console.log("JWT token cleared from chrome.storage.local.");
        sendResponse({ success: true });
      });
    }
  } else if (request.action === "triggerAutoSync") {
    const { problemKey, payload } = request;
    console.log(`LeetCode Tracker [Auto Sync]: Auto sync started for URL: ${payload.url}`);

    chrome.storage.local.get([problemKey], async (result) => {
      
      const problemData = result[problemKey] || {};
      const company = problemData.company || null;
      const challenge = problemData.challenge || null;
      const day = (problemData.day !== undefined && problemData.day !== null) ? Number(problemData.day) : null;
      const pattern = problemData.pattern || null;
      const sheet = problemData.sheet || null;

      const finalCompany = payload.company || company || null;
      const finalChallenge = payload.challenge || challenge || null;
      let finalDay = null;
      if (payload.day !== undefined && payload.day !== null && !isNaN(Number(payload.day))) {
        finalDay = Number(payload.day);
      } else if (day !== null && !isNaN(day)) {
        finalDay = day;
      }
      const finalPattern = payload.pattern || pattern || null;
      const finalSheet = payload.sheet || sheet || null;

      const currentContext = getSyncContext({
        company: finalCompany,
        challenge: finalChallenge,
        day: finalDay,
        pattern: finalPattern,
        sheet: finalSheet
      });

      // Update state to checking auth
      updateSyncState(problemKey, currentContext, "checking_auth", "Checking Authentication...");

      // Attempt validation / browser recovery
      const token = await getOrRecoverToken();
      if (!token) {
        updateSyncState(problemKey, currentContext, "pending_auth", "Login Required");
        showNotification("auth_expired");
        sendResponse({ success: false, error: "Login Required" });
        return;
      }

      updateSyncState(problemKey, currentContext, "preparing_sync", "Preparing Sync...");

      const syncPayload = {
        ...payload,
        company: finalCompany,
        challenge: finalChallenge,
        day: finalDay,
        pattern: finalPattern,
        sheet: finalSheet,
        syncContext: currentContext
      };

      updateSyncState(problemKey, currentContext, "syncing", "Syncing...");

      fetch(`${CONFIG.API_BASE_URL}/api/extension/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(syncPayload)
      })
        .then(async (response) => {
          console.log(`[Auto Sync] HTTP status code: ${response.status}`);

          if (response.status === 401) {
            chrome.storage.local.remove(["token"], () => {
              console.log("[Auto Sync] Unauthorized (401) - Token removed from storage.");
            });
            const error = new Error("Login Required");
            error.status = 401;
            throw error;
          }
          if (response.status === 403) {
            const error = new Error("You don't have permission to perform this sync.");
            error.status = 403;
            throw error;
          }
          if (response.status === 404) {
            const error = new Error("Sync service unavailable.");
            error.status = 404;
            throw error;
          }
          if (response.status >= 500) {
            const error = new Error("Server error. Please try again later.");
            error.status = response.status;
            throw error;
          }
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const error = new Error(errData.error || "Unable to sync right now. Please try again.");
            error.status = response.status;
            throw error;
          }
          return response.json();
        })
        .then((res) => {
          console.log(`LeetCode Tracker [Auto Sync]: Auto sync success for URL: ${payload.url} under context ${currentContext}`);
          showNotification("success");
          updateSyncState(problemKey, currentContext, "synced", "Synced Successfully", () => {
            sendResponse({ success: true, data: res });
          });
        })
        .catch((err) => {
          console.error("LeetCode Tracker [Auto Sync]: Complete technical error:", err);

          let state = "failed";
          let errorMsg = "Unable to sync right now. Please try again.";
          let notificationType = null;

          if (err && err.status === 401) {
            state = "pending_auth";
            errorMsg = "Login Required";
            notificationType = "auth_expired";
          } else if (err && err.status === 403) {
            state = "failed";
            errorMsg = "You don't have permission to perform this sync.";
          } else if (err && err.status === 404) {
            state = "failed";
            errorMsg = "Sync service unavailable.";
          } else if (err && err.status >= 500) {
            state = "failed";
            errorMsg = "Waiting for Server...";
            enqueueSubmission(problemKey, payload, currentContext);
          } else if (
            !err ||
            err instanceof TypeError ||
            (err.message && (
              err.message.toLowerCase().includes("failed to fetch") ||
              err.message.toLowerCase().includes("networkerror") ||
              err.message.toLowerCase().includes("cors") ||
              err.message.toLowerCase().includes("network connection lost")
            ))
          ) {
            state = "failed";
            errorMsg = "Waiting for Internet...";
            notificationType = "network_error";
            enqueueSubmission(problemKey, payload, currentContext);
          } else if (err && err.message) {
            const msg = err.message.toLowerCase();
            if (msg.includes("401") || msg.includes("unauthorized")) {
              state = "pending_auth";
              errorMsg = "Login Required";
              notificationType = "auth_expired";
            } else if (msg.includes("403")) {
              state = "failed";
              errorMsg = "You don't have permission to perform this sync.";
            } else if (msg.includes("404")) {
              state = "failed";
              errorMsg = "Sync service unavailable.";
            } else if (msg.includes("500")) {
              state = "failed";
              errorMsg = "Waiting for Server...";
              enqueueSubmission(problemKey, payload, currentContext);
            } else {
              errorMsg = err.message;
            }
          }

          if (notificationType) {
            showNotification(notificationType);
          }

          updateSyncState(problemKey, currentContext, state, errorMsg, () => {
            sendResponse({ success: false, error: errorMsg });
          });
        });
    });
    return true; // async response
  } else if (request.action === "showSyncNotification") {
    showNotification(request.type);
    sendResponse({ success: true });
    return true;
  }

  // Return true to indicate we wish to send a response asynchronously
  return true;
});

// Alarm Listener for Queue Processing
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "codeprep_retry_alarm") {
    processQueue();
  }
});

function getSyncContext(payload) {
  if (!payload) return 'general';
  if (payload.challenge === 'gv' && payload.day !== undefined && payload.day !== null) {
    return `gv_day${payload.day}`;
  }
  if (payload.company) {
    return `company_${payload.company}`;
  }
  if (payload.pattern) {
    return `pattern_${payload.pattern}`;
  }
  if (payload.sheet) {
    return `sheet_${payload.sheet}`;
  }
  return 'general';
}

function updateSyncState(problemKey, currentContext, syncState, syncError, callback) {
  chrome.storage.local.get([problemKey], (problemResult) => {
    const existing = problemResult[problemKey] || {};
    if (!existing.contexts) {
      existing.contexts = {};
    }
    existing.contexts[currentContext] = {
      syncState: syncState,
      syncError: syncError,
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...existing,
      status: "Accepted",
      timestamp: new Date().toISOString()
    };
    chrome.storage.local.set({ [problemKey]: updated }, () => {
      if (callback) callback();
    });
  });
}



async function verifyTokenValidity(token) {
  try {
    console.log("[Verify] Checking token...");

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    console.log("[Verify] Status:", response.status);

    const text = await response.text();
    console.log("[Verify] Response:", text);

    return response.ok;

  } catch (err) {
    console.error("[Verify] Fetch Error:", err);
    return false;
  }
}

function attemptBrowserSessionRecovery() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        return resolve(null);
      }

      const allowedDomains = [
        "localhost:5173",
        "127.0.0.1:5173",
        "code-prep-three.vercel.app"
      ];

      const codePrepTabs = tabs.filter(
        (t) => t.url && allowedDomains.some((domain) => t.url.includes(domain))
      );

      if (codePrepTabs.length === 0) {
        return resolve(null);
      }

      let resolved = false;
      let checkedCount = 0;

      codePrepTabs.forEach((tab) => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "getTokenFromBrowser" },
          (response) => {

            // ✅ Handle missing content script
            if (chrome.runtime.lastError) {
              console.warn(
                `[Recovery] Tab ${tab.id}:`,
                chrome.runtime.lastError.message
              );

              checkedCount++;

              if (checkedCount === codePrepTabs.length && !resolved) {
                resolve(null);
              }
              return;
            }

            checkedCount++;

            if (response?.token && !resolved) {
              resolved = true;
              resolve(response.token);
              return;
            }

            if (checkedCount === codePrepTabs.length && !resolved) {
              resolve(null);
            }
          }
        );
      });
    });
  });
}

function getOrRecoverToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token"], async (result) => {

      console.log("========== TOKEN DEBUG ==========");
      console.log("Stored token:", result.token);

      let token = result.token;

      if (token) {
        const isValid = await verifyTokenValidity(token);

        console.log("Token valid:", isValid);

        if (isValid) {
          console.log("Returning stored token");
          return resolve(token);
        }

        console.log("Stored token exists but validation failed.");
      } else {
        console.log("No token found in chrome.storage.local");
      }

      console.log("[Auto Sync] Token missing or invalid. Attempting silent browser recovery...");

      const recoveredToken = await attemptBrowserSessionRecovery();

      if (recoveredToken) {
        console.log("Recovered token:", recoveredToken);

        const isValid = await verifyTokenValidity(recoveredToken);

        console.log("Recovered token valid:", isValid);

        if (isValid) {
          chrome.storage.local.set({ token: recoveredToken });
          return resolve(recoveredToken);
        }
      }

      resolve(null);
    });
  });
}

function enqueueSubmission(problemKey, payload, syncContext) {
  chrome.storage.local.get(["sync_queue"], (result) => {
    let queue = result.sync_queue || [];
    const exists = queue.some(item => item.problemKey === problemKey && item.syncContext === syncContext);
    if (!exists) {
      queue.push({
        problemKey,
        payload,
        syncContext,
        timestamp: Date.now()
      });
      chrome.storage.local.set({ sync_queue: queue }, () => {
        console.log(`[Queue] Enqueued problem ${problemKey} for context ${syncContext}`);
        chrome.alarms.create("codeprep_retry_alarm", { periodInMinutes: 1 });
      });
    }
  });
}

async function processQueue() {
  const token = await getOrRecoverToken();
  if (!token) {
    console.log("[Queue] Retry skipped: Authentication required.");
    return;
  }

  chrome.storage.local.get(["sync_queue"], (result) => {
    let queue = result.sync_queue || [];
    if (queue.length === 0) {
      chrome.alarms.clear("codeprep_retry_alarm");
      return;
    }

    console.log(`[Queue] Processing ${queue.length} items in sync queue...`);
    let pending = [...queue];
    let processedCount = 0;

    queue.forEach((item) => {
      const { problemKey, payload, syncContext } = item;

      // Update context sync state to Retrying...
      updateSyncState(problemKey, syncContext, "syncing", "Retrying...");

      fetch(`${CONFIG.API_BASE_URL}/api/extension/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...payload, syncContext })
      })
        .then(async (response) => {
          if (response.status === 401) {
            chrome.storage.local.remove(["token"]);
            throw { status: 401 };
          }
          if (!response.ok) {
            throw { status: response.status };
          }
          return response.json();
        })
        .then((res) => {
          console.log(`[Queue] Successfully synced queued item ${problemKey}`);
          pending = pending.filter(p => !(p.problemKey === problemKey && p.syncContext === syncContext));

          chrome.storage.local.get([problemKey], (problemResult) => {
            const existing = problemResult[problemKey] || {};
            if (!existing.contexts) {
              existing.contexts = {};
            }
            existing.contexts[syncContext] = {
              syncState: "synced",
              timestamp: new Date().toISOString()
            };
            const updated = {
              ...existing,
              status: "Accepted",
              timestamp: new Date().toISOString()
            };
            chrome.storage.local.set({ [problemKey]: updated });
          });
        })
        .catch((err) => {
          console.error(`[Queue] Failed to sync item ${problemKey}:`, err);
          let errorMsg = "Waiting for Internet...";
          if (err && err.status >= 500) {
            errorMsg = "Waiting for Server...";
          } else if (err && err.status === 401) {
            errorMsg = "Login Required";
          }
          updateSyncState(problemKey, syncContext, "failed", errorMsg);
        })
        .finally(() => {
          processedCount++;
          if (processedCount === queue.length) {
            chrome.storage.local.set({ sync_queue: pending }, () => {
              if (pending.length === 0) {
                console.log("[Queue] Queue empty. Clearing retry alarm.");
                chrome.alarms.clear("codeprep_retry_alarm");
                showNotification("success");
              }
            });
          }
        });
    });
  });
}

function showNotification(type) {
  const now = Date.now();
  chrome.storage.local.get(["lastNotificationType", "lastNotificationTime"], (res) => {
    const lastType = res.lastNotificationType;
    const lastTime = res.lastNotificationTime || 0;

    // Prevent notification spam: If same type is shown within a short time (60 seconds) or before state changes.
    if (lastType === type && (now - lastTime < 60000)) {
      console.log(`[Notification] Spam prevented for type: ${type}`);
      return;
    }

    chrome.storage.local.set({
      lastNotificationType: type,
      lastNotificationTime: now
    }, () => {
      let title = "";
      let message = "";

      if (type === "success") {
        title = "✅ CodePrep";
        message = "Problem synced successfully.";
      } else if (type === "auth_expired") {
        title = "⚠️ Login Required";
        message = "Please login to CodePrep again.";
      } else if (type === "network_error") {
        title = "🌐 Network Error";
        message = "Sync will retry when connection is available.";
      } else {
        return;
      }

      chrome.notifications.create(`codeprep_notif_${type}_${now}`, {
        type: "basic",
        iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        title: title,
        message: message,
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.warn("Failed to create notification:", chrome.runtime.lastError.message);
        } else {
          console.log("Notification created successfully:", notificationId);
        }
      });
    });
  });
}
