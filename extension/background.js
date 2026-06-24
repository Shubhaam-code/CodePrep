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
  }

  // Return true to indicate we wish to send a response asynchronously (if needed)
  return true;
});
