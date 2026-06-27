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
        console.error(`LeetCode Tracker [Auto Sync]: Auto sync failed for URL: ${payload.url}. Error: Please login to CodePrep website first.`);
        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          if (!existing.contexts) {
            existing.contexts = {};
          }
          existing.contexts[currentContext] = {
            syncState: "pending_auth",
            syncError: "Please login to CodePrep website first.",
            timestamp: new Date().toISOString()
          };
          const updated = {
            ...existing,
            status: "Accepted",
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ [problemKey]: updated }, () => {
            sendResponse({ success: false, error: "Please login to CodePrep website first." });
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
        if (response.status === 401) {
          throw new Error("Unauthorized. Please login to CodePrep website again.");
        }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((res) => {
        console.log(`LeetCode Tracker [Auto Sync]: Auto sync success for URL: ${payload.url} under context ${currentContext}`);
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
        console.error(`LeetCode Tracker [Auto Sync]: Auto sync failed for URL: ${payload.url}. Error: ${err.message}`);
        
        let state = "failed";
        let errorMsg = err.message;
        if (err.message.includes("login") || err.message.includes("Unauthorized")) {
          state = "pending_auth";
          errorMsg = "Please login to CodePrep website first.";
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
            sendResponse({ success: false, error: err.message });
          });
        });
      });
    });
    return true; // async response
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
