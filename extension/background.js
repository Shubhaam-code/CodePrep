// background.js - Service Worker for LeetCode Tracker Companion
importScripts('config.js');


async function setupDynamicContentScript() {
  try {
    const scriptId = "codeprep-content-script";
    
    // 1. Unregister if already exists to prevent duplicate ID errors
    if (typeof chrome.scripting.getRegisteredContentScripts === "function") {
      const scripts = await chrome.scripting.getRegisteredContentScripts();
      const exists = scripts.some(s => s.id === scriptId);
      if (exists) {
        await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
        console.log("[background.js] Unregistered existing dynamic content script.");
      }
      
      // 2. Determine matches based on FRONTEND_URL
      let matches = [];
      if (CONFIG.FRONTEND_URL) {
        try {
          const url = new URL(CONFIG.FRONTEND_URL);
          // Match the base domain and any path on it (Chrome match patterns reject port numbers)
          matches.push(`${url.protocol}//${url.hostname}/*`);
        } catch (e) {
          console.error("[background.js] Failed to parse CONFIG.FRONTEND_URL:", e);
        }
      }
      
      // Remove duplicate matches
      matches = Array.from(new Set(matches));

      if (matches.length === 0) {
        console.warn("[background.js] No matches resolved for dynamic content script registration. Skipping registration.");
        return;
      }

      console.log("[background.js] Registering dynamic content script for matches:", matches);

      // 3. Register content script
      await chrome.scripting.registerContentScripts([
        {
          id: scriptId,
          matches: matches,
          js: ["contentCodePrep.js"],
          runAt: "document_idle"
        }
      ]);
      console.log("[background.js] Successfully registered dynamic content script.");
    }
  } catch (error) {
    console.error("[background.js] Failed to register dynamic content script:", error);
    if (error.message && (error.message.includes("Permission denied") || error.message.includes("permission"))) {
      console.warn("[background.js] Permission warning: Make sure the target domain is included in the manifest.json host_permissions array.");
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetCode Tracker Companion Extension Installed.");
  setupDynamicContentScript();
});

// Run setup immediately on service worker start
setupDynamicContentScript();

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
