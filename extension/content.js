// content.js - Injected into leetcode.com/problems/*

console.log("LeetCode Tracker Companion Content Script Injected.");

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProblemDetails") {
    try {
      const details = extractProblemDetails();
      sendResponse({ success: true, data: details });
    } catch (error) {
      console.error("Error extracting LeetCode problem details:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  // Return true to indicate we will respond asynchronously
  return true;
});

/**
 * Extracts question details from the active LeetCode page.
 */
function extractProblemDetails() {
  const url = window.location.href;
  
  // Extract Title
  let rawTitle = "";
  let cleanTitle = "";
  let leetcodeId = null;

  // 1. Look for LeetCode title elements in the DOM (modern UI)
  const titleSelector = 'div.text-title-large, span.text-title-large, [data-cy="question-title"], h4, div[class*="question-title"]';
  const titleEl = document.querySelector(titleSelector);
  
  if (titleEl) {
    rawTitle = titleEl.textContent.trim();
  } else {
    // Fallback: Clean up document.title (e.g. "1. Two Sum - LeetCode")
    const docTitle = document.title;
    const titleMatch = docTitle.match(/^(.+?)(?:\s*-\s*LeetCode.*)?$/i);
    if (titleMatch) {
      rawTitle = titleMatch[1].trim();
    }
  }

  // Parse ID and clean title if formatted like "123. Title Name"
  if (rawTitle) {
    const idMatch = rawTitle.match(/^(\d+)\.\s*(.+)$/);
    if (idMatch) {
      leetcodeId = parseInt(idMatch[1], 10);
      cleanTitle = idMatch[2].trim();
    } else {
      cleanTitle = rawTitle;
    }
  }

  // Extract Difficulty
  const difficulty = findDifficulty();

  return {
    leetcodeId,
    title: cleanTitle || rawTitle || "Unknown Question",
    url,
    difficulty: difficulty || "Unknown",
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper to look up the difficulty badge in LeetCode.
 */
function findDifficulty() {
  // Common CSS selectors for difficulty badges
  const selectors = [
    'div.text-difficulty-easy', 'div.text-difficulty-medium', 'div.text-difficulty-hard',
    'span.text-difficulty-easy', 'span.text-difficulty-medium', 'span.text-difficulty-hard',
    'div.text-easy-s', 'div.text-medium-s', 'div.text-hard-s',
    'span.text-easy-s', 'span.text-medium-s', 'span.text-hard-s',
    '[class*="difficulty-"]', '[class*="easy-"]', '[class*="medium-"]', '[class*="hard-"]'
  ];

  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (/^(easy|medium|hard)$/i.test(text)) {
          return capitalize(text);
        }
      }
    } catch (e) {
      // Ignore selectors that might fail syntax validation
    }
  }

  // Fallback: Scan text contents of elements matching standard text tags
  const textElements = Array.from(document.querySelectorAll('div, span, p, a'));
  for (const el of textElements) {
    const text = el.textContent.trim();
    if (/^(easy|medium|hard)$/i.test(text)) {
      // Ensure it is a short label element to avoid high-level container matches
      if (text.length < 10 && el.children.length === 0) {
        return capitalize(text);
      }
    }
  }

  return null;
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// --- Submission Detection Logic ---

// Global active problem key
let currentProblemKey = getProblemKey(window.location.href);
let lastUrl = window.location.href;

// Normalize helper for problem key
function getProblemKey(url) {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/problems\/([^/]+)/);
    if (match) {
      return `leetcode_problem_${match[1]}`;
    }
  } catch (e) {}
  return `leetcode_problem_${url}`;
}

// Watch for client-side routing changes in LeetCode (SPA)
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    currentProblemKey = getProblemKey(lastUrl);
    console.log("LeetCode Tracker: URL change detected, updated problem key:", currentProblemKey);
  }
}, 1000);

function checkSubmissionStatus() {
  // 1. Check data-e2e-locator="submission-result" first
  const e2eLocator = document.querySelector('[data-e2e-locator="submission-result"]');
  if (e2eLocator) {
    const text = e2eLocator.textContent.trim();
    if (text === "Accepted") {
      return "Accepted";
    }
  }

  // 2. Common LeetCode success selectors
  const selectors = [
    '.text-success',
    '[class*="text-green"]',
    '[class*="text-emerald"]',
    '[class*="submission-result"]'
  ];

  for (const sel of selectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        if (el.textContent.trim() === "Accepted") {
          return "Accepted";
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: check style colors on elements containing "Accepted" text
  const elements = Array.from(document.querySelectorAll('span, div, p'));
  for (const el of elements) {
    const text = el.textContent.trim();
    if (text === "Accepted") {
      try {
        const style = window.getComputedStyle(el);
        const color = style.color; // e.g. "rgb(16, 185, 129)"
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const r = parseInt(rgb[0], 10);
          const g = parseInt(rgb[1], 10);
          const b = parseInt(rgb[2], 10);
          if (g > 100 && g > r * 1.3 && g > b * 1.3) {
            return "Accepted";
          }
        }
      } catch (err) {}
    }
  }
  return null;
}

function saveAcceptedStatus() {
  chrome.storage.local.get([currentProblemKey], (result) => {
    if (!result[currentProblemKey] || result[currentProblemKey].status !== "Accepted") {
      const data = {
        status: "Accepted",
        timestamp: new Date().toISOString()
      };
      chrome.storage.local.set({ [currentProblemKey]: data }, () => {
        console.log(`LeetCode Tracker: Status set to Accepted for problem ${currentProblemKey}`);
      });
    }
  });
}

// Debounced MutationObserver to avoid performance lag on rapid typing / DOM updates
let debounceTimer = null;
function initializeSubmissionObserver() {
  console.log("LeetCode Tracker: Initializing MutationObserver for submission detection.");
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const status = checkSubmissionStatus();
      if (status === "Accepted") {
        saveAcceptedStatus();
      }
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start observing on injection
initializeSubmissionObserver();

