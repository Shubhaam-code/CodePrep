// config.js
// Centralized configuration system for LeetCode Tracker Companion

const RAW_CONFIG = {
  // Explicit override: "development" or "production". Set to null for auto-detection.
  ENV: null,

  development: {
    API_BASE_URL: "http://localhost:5000",
    FRONTEND_URL: "http://localhost:5173"
  },

  production: {
    API_BASE_URL: "https://api.codeprep.com", // Modify with your deployed backend URL
    FRONTEND_URL: "https://codeprep.com"       // Modify with your deployed frontend URL
  }
};

// 1. Determine active environment safely
let activeEnv = RAW_CONFIG.ENV;

if (!activeEnv) {
  const hasChromeRuntime = typeof chrome !== 'undefined' && chrome.runtime?.getManifest;
  if (hasChromeRuntime) {
    const manifest = chrome.runtime.getManifest();
    activeEnv = manifest.update_url ? "production" : "development";
  } else {
    activeEnv = "development";
  }
}

const activeSettings = RAW_CONFIG[activeEnv] || RAW_CONFIG.development;

// 2. Perform security validations on active settings
if (activeEnv === "production") {
  if (activeSettings.API_BASE_URL && !activeSettings.API_BASE_URL.startsWith("https://")) {
    console.warn(`[CodePrep Config] Security Warning: Production API base URL (${activeSettings.API_BASE_URL}) is not secure (HTTPS).`);
  }
  if (activeSettings.FRONTEND_URL && !activeSettings.FRONTEND_URL.startsWith("https://")) {
    console.warn(`[CodePrep Config] Security Warning: Production Frontend URL (${activeSettings.FRONTEND_URL}) is not secure (HTTPS).`);
  }
}

// 3. Expose active configuration
const CONFIG = {
  ENV: activeEnv,
  API_BASE_URL: activeSettings.API_BASE_URL,
  FRONTEND_URL: activeSettings.FRONTEND_URL
};

// Expose CONFIG globally across both Service Worker (self) and Window (window) contexts
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
