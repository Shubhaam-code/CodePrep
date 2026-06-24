// background.js - Service Worker for LeetCode Tracker Companion

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetCode Tracker Companion Extension Installed.");
});

// Extensibility: Placeholder for handling messages between the content script,
// popup, and the local backend server (e.g. syncing submissions or authenticating).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in background service worker:", request);

  if (request.action === "getBackgroundStatus") {
    sendResponse({ status: "active", version: "1.0.0" });
  } else if (request.action === "storeToken") {
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
    console.log(`LeetCode Tracker [Auto Sync]: Auto sync started for URL: ${payload.url}`);

    chrome.storage.local.get(["token"], (result) => {
      const token = result.token;
      if (!token) {
        console.error(`LeetCode Tracker [Auto Sync]: Auto sync failed for URL: ${payload.url}. Error: Please login to CodePrep website first.`);
        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          const updated = {
            ...existing,
            status: "Accepted",
            syncState: "pending_auth",
            syncError: "Please login to CodePrep website first.",
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ [problemKey]: updated }, () => {
            sendResponse({ success: false, error: "Please login to CodePrep website first." });
          });
        });
        return;
      }

      fetch("http://localhost:5000/api/extension/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
        console.log(`LeetCode Tracker [Auto Sync]: Auto sync success for URL: ${payload.url}`);
        chrome.storage.local.get([problemKey], (problemResult) => {
          const existing = problemResult[problemKey] || {};
          const updated = {
            ...existing,
            status: "Accepted",
            syncState: "synced",
            timestamp: new Date().toISOString()
          };
          delete updated.syncError;
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
          const updated = {
            ...existing,
            status: "Accepted",
            syncState: state,
            syncError: errorMsg,
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
