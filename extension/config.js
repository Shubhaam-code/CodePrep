// config.js
// Centralized configuration for LeetCode Tracker Companion extension.
//
// HOW ENVIRONMENT DETECTION WORKS:
//   - Chrome Web Store installs ALWAYS have `update_url` injected into their manifest.
//   - Locally unpacked/dev extensions NEVER have `update_url`.
//   - So:  update_url present  →  production (Web Store install)
//          update_url absent   →  development (unpacked / local)
//
// TO FORCE LOCAL DEV MODE: set ENV to "development" below (remember to revert before commit!).
// TO FORCE PRODUCTION:     set ENV to "production".
// FOR AUTO-DETECT (recommended): keep ENV as null.

const RAW_CONFIG = {
  // Manual override: "development" | "production" | null (auto-detect).
  // ⚠️  KEEP THIS null BEFORE COMMITTING — auto-detect handles both envs correctly.
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

// ─── Environment Detection ────────────────────────────────────────────────────
// Priority:
//   1. RAW_CONFIG.ENV (manual override for local dev testing)
//   2. manifest.update_url presence (Chrome Web Store installs always have it)
//   3. Fall back to "production" — safer than leaking localhost into production

let activeEnv = RAW_CONFIG.ENV;

if (!activeEnv) {
  try {
    const hasChromeRuntime =
      typeof chrome !== 'undefined' &&
      typeof chrome.runtime !== 'undefined' &&
      typeof chrome.runtime.getManifest === 'function';

    if (hasChromeRuntime) {
      const manifest = chrome.runtime.getManifest();
      // Chrome Web Store installs always include update_url.
      // Local unpacked extensions never have update_url.
      // Default to "production" for unpacked — avoids localhost in prod builds.
      activeEnv = manifest.update_url ? "production" : "development";
      // ↑ To test against local backend with an unpacked extension,
      //   change RAW_CONFIG.ENV to "development" at the top of this file.
    } else {
      // Not running inside the Chrome extension runtime (e.g. unit test context).
      // Default to production for safety — avoids leaking localhost into any non-dev context.
      activeEnv = "production";
    }
  } catch (e) {
    // Any runtime error defaults to production for safety.
    activeEnv = "production";
  }
}

const activeSettings = RAW_CONFIG[activeEnv] || RAW_CONFIG.production;

// ─── Security Validation ──────────────────────────────────────────────────────
if (activeEnv === "production") {
  if (activeSettings.API_BASE_URL && !activeSettings.API_BASE_URL.startsWith("https://")) {
    throw new Error(
      `[CodePrep Config] Security Error: Production API_BASE_URL must use HTTPS. Got: ${activeSettings.API_BASE_URL}`
    );
  }
  if (activeSettings.FRONTEND_URL && !activeSettings.FRONTEND_URL.startsWith("https://")) {
    throw new Error(
      `[CodePrep Config] Security Error: Production FRONTEND_URL must use HTTPS. Got: ${activeSettings.FRONTEND_URL}`
    );
  }
}

console.log(`[CodePrep Config] Active environment: ${activeEnv} | API: ${activeSettings.API_BASE_URL} | update_url detected: ${'update_url' in (typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getManifest() : {})}`);

// ─── Export ───────────────────────────────────────────────────────────────────
const CONFIG = {
  ENV: activeEnv,
  API_BASE_URL: activeSettings.API_BASE_URL,
  FRONTEND_URL: activeSettings.FRONTEND_URL
};

// Expose globally for Service Worker (self) and popup/content script (window) contexts.
if (typeof self !== 'undefined') self.CONFIG = CONFIG;
if (typeof window !== 'undefined') window.CONFIG = CONFIG;