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
        console.log("JWT token removed from chrome.storage.local.");
        sendResponse({ success: true });
      });
    }
  } else if (request.action === "triggerAutoSync") {
    const { problemKey, payload } = request;
    console.log("BACKGROUND PAYLOAD COMPANY:", payload.company);
    console.log("FULL PAYLOAD:", payload);
    console.log(`LeetCode Tracker [Auto Sync]: Auto sync started for URL: ${payload.url}`);

    chrome.storage.local.get(["token", problemKey], (result) => {
      const token = result.token;
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

      if (!token) {
        console.error(`LeetCode Tracker [Auto Sync]: Auto sync failed for URL: ${payload.url}. Error: Please login to CodePrep.`);
        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          if (!existing.contexts) {
            existing.contexts = {};
          }
          existing.contexts[currentContext] = {
            syncState: "pending_auth",
            syncError: "Please login to CodePrep.",
            timestamp: new Date().toISOString()
          };
          const updated = {
            ...existing,
            status: "Accepted",
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ [problemKey]: updated }, () => {
            sendResponse({ success: false, error: "Please login to CodePrep." });
          });
        });
        return;
      }

      const syncPayload = {
        ...payload,
        company: finalCompany,
        challenge: finalChallenge,
        day: finalDay,
        pattern: finalPattern,
        sheet: finalSheet,
        syncContext: currentContext
      };
      console.log("REQUEST BODY SENT TO BACKEND:");
      console.log(JSON.stringify(syncPayload, null, 2));
      console.log("PAYLOAD COMPANY:", payload?.company);
      console.log("SYNC PAYLOAD COMPANY:", syncPayload?.company);
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
          const error = new Error("CodePrep authentication expired. Please login again.");
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
        
        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          if (!existing.contexts) {
            existing.contexts = {};
          }
          existing.contexts[currentContext] = {
            syncState: "synced",
            timestamp: new Date().toISOString()
          };
          const updated = {
            ...existing,
            status: "Accepted",
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ [problemKey]: updated }, () => {
            sendResponse({ success: true, data: res });
          });
        });
      })
      .catch((err) => {
        console.error("LeetCode Tracker [Auto Sync]: Complete technical error:", err);
        
        let state = "failed";
        let errorMsg = "Unable to sync right now. Please try again.";
        let notificationType = null;

        if (err && err.status === 401) {
          state = "pending_auth";
          errorMsg = "CodePrep authentication expired. Please login again.";
          notificationType = "auth_expired";
        } else if (err && err.status === 403) {
          state = "failed";
          errorMsg = "You don't have permission to perform this sync.";
        } else if (err && err.status === 404) {
          state = "failed";
          errorMsg = "Sync service unavailable.";
        } else if (err && err.status >= 500) {
          state = "failed";
          errorMsg = "Server error. Please try again later.";
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
          errorMsg = "No internet connection.";
          notificationType = "network_error";
        } else if (err && err.message) {
          const msg = err.message.toLowerCase();
          if (msg.includes("401") || msg.includes("unauthorized")) {
            state = "pending_auth";
            errorMsg = "CodePrep authentication expired. Please login again.";
            notificationType = "auth_expired";
          } else if (msg.includes("403")) {
            state = "failed";
            errorMsg = "You don't have permission to perform this sync.";
          } else if (msg.includes("404")) {
            state = "failed";
            errorMsg = "Sync service unavailable.";
          } else if (msg.includes("500")) {
            state = "failed";
            errorMsg = "Server error. Please try again later.";
          } else {
            errorMsg = err.message;
          }
        }

        if (notificationType) {
          showNotification(notificationType);
        }

        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          if (!existing.contexts) {
            existing.contexts = {};
          }
          existing.contexts[currentContext] = {
            syncState: state,
            syncError: errorMsg,
            timestamp: new Date().toISOString()
          };
          const updated = {
            ...existing,
            status: "Accepted",
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ [problemKey]: updated }, () => {
            sendResponse({ success: false, error: errorMsg });
          });
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
