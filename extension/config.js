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
    API_BASE_URL: "https://codeprep-w0nr.onrender.com",
    FRONTEND_URL: "https://code-prep-three.vercel.app"
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
    throw new Error(`[CodePrep Config] Security Error: Production API base URL (${activeSettings.API_BASE_URL}) must use secure HTTPS connection.`);
  }
  if (activeSettings.FRONTEND_URL && !activeSettings.FRONTEND_URL.startsWith("https://")) {
    throw new Error(`[CodePrep Config] Security Error: Production Frontend URL (${activeSettings.FRONTEND_URL}) must use secure HTTPS connection.`);
  }
}

console.log(`[CodePrep Config] Active environment: ${activeEnv}`);

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
