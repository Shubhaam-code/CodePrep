// content.js - Injected into leetcode.com/problems/*

console.log("LeetCode Tracker Companion Content Script Injected.");

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProblemDetails") {
    console.log("LeetCode Tracker: getProblemDetails request received from popup.");
    getActiveCodeAndLanguage().then((codeInfo) => {
      try {
        const details = extractProblemDetails();
        // Append active editor details to response payload
        details.extractedCode = codeInfo.code;
        details.extractedLanguage = codeInfo.language;
        
        console.log("LeetCode Tracker: Extracted Details:", details);
        sendResponse({ success: true, data: details });
      } catch (error) {
        console.error("Error extracting LeetCode details:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
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

  const urlParams = new URLSearchParams(window.location.search);
  const company = urlParams.get('company') || null;
  const challenge = urlParams.get('challenge') || null;
  const dayStr = urlParams.get('day');
  const day = dayStr ? Number(dayStr) : null;
  const pattern = urlParams.get('pattern') || null;
  const sheet = urlParams.get('sheet') || null;

  return {
    leetcodeId,
    title: cleanTitle || rawTitle || "Unknown Question",
    url,
    difficulty: difficulty || "Unknown",
    company,
    challenge,
    day,
    pattern,
    sheet,
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
// Global active problem key and locks
let currentProblemKey = getProblemKey(window.location.href);
let lastUrl = window.location.href;
const activeSyncLocks = new Set();

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

// Watch for client-side routing changes in LeetCode (SPA)
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    currentProblemKey = getProblemKey(lastUrl);
    console.log("LeetCode Tracker: URL change detected, updated problem key:", currentProblemKey);
    extractMetadataFromUrl();
  }
}, 1000);

function extractMetadataFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);

    const company   = urlParams.get('company')   || null;
    const challenge = urlParams.get('challenge') || null;
    const dayStr    = urlParams.get('day');
    const day       = dayStr ? Number(dayStr) : null;
    const pattern   = urlParams.get('pattern')   || null;
    const sheet     = urlParams.get('sheet')     || null;

    const hasContextParams = company || challenge || (day !== null) || pattern || sheet;

    console.log(`[Auto Sync] URL metadata parsed — company: ${company}, challenge: ${challenge}, day: ${day}, pattern: ${pattern}, sheet: ${sheet}, hasParams: ${hasContextParams}`);

    chrome.storage.local.get([currentProblemKey], (result) => {
      const existing = result[currentProblemKey] || {};

      const updated = hasContextParams
        ? { ...existing, company, challenge, day, pattern, sheet }
        : { ...existing };

      chrome.storage.local.set({ [currentProblemKey]: updated }, () => {
        console.log(
          `[Auto Sync] Metadata ${hasContextParams ? 'overwritten' : 'preserved'} for ${currentProblemKey}:`,
          { company: updated.company, challenge: updated.challenge, day: updated.day, pattern: updated.pattern, sheet: updated.sheet }
        );
      });
    });
  } catch (e) {
    console.error("[Auto Sync] Error extracting metadata from URL:", e);
  }
}

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
  if (activeSyncLocks.has(currentProblemKey)) {
    console.log(`[Auto Sync] Duplicate trigger prevented for ${currentProblemKey}`);
    return;
  }

  // Acquire lock synchronously before starting async operations
  activeSyncLocks.add(currentProblemKey);
  console.log(`[Auto Sync] Lock acquired for ${currentProblemKey}`);

  chrome.storage.local.get([currentProblemKey], (result) => {
    const existing = result[currentProblemKey] || {};
    
    const urlParams = new URLSearchParams(window.location.search);
    const companyFromUrl = urlParams.get("company");
    const challengeFromUrl = urlParams.get("challenge");
    const dayFromUrl = urlParams.get("day") ? Number(urlParams.get("day")) : null;
    const patternFromUrl = urlParams.get("pattern");
    const sheetFromUrl = urlParams.get("sheet");

    const finalCompany = companyFromUrl || existing.company || null;
    const finalChallenge = challengeFromUrl || existing.challenge || null;
    const finalDay = (dayFromUrl !== null && !isNaN(dayFromUrl)) ? dayFromUrl : ((existing.day !== undefined && existing.day !== null) ? existing.day : null);
    const finalPattern = patternFromUrl || existing.pattern || null;
    const finalSheet = sheetFromUrl || existing.sheet || null;

    const currentContext = getSyncContext({
      company: finalCompany,
      challenge: finalChallenge,
      day: finalDay,
      pattern: finalPattern,
      sheet: finalSheet
    });

    const contextData = (existing.contexts && existing.contexts[currentContext]) || {};
    
    // Check if status is already Accepted and if it's already syncing/synced to prevent duplicate requests
    if (existing.status === "Accepted" && (contextData.syncState === "synced" || contextData.syncState === "syncing")) {
      activeSyncLocks.delete(currentProblemKey);
      console.log(`[Auto Sync] Lock released for ${currentProblemKey} (already processed/processing in context ${currentContext})`);
      return;
    }

    console.log(`LeetCode Tracker [Auto Sync]: Accepted detected for ${currentProblemKey}`);

    // Set temporary lock/state to "syncing"
    if (!existing.contexts) {
      existing.contexts = {};
    }
    existing.contexts[currentContext] = {
      syncState: "syncing",
      timestamp: new Date().toISOString()
    };

    const data = {
      ...existing,
      status: "Accepted",
      company: finalCompany,
      challenge: finalChallenge,
      day: finalDay,
      pattern: finalPattern,
      sheet: finalSheet,
      timestamp: new Date().toISOString()
    };

    chrome.storage.local.set({ [currentProblemKey]: data }, () => {
      console.log(`LeetCode Tracker [Auto Sync]: Status set to syncing for problem ${currentProblemKey} under context ${currentContext}`);
      
      // Extract active editor details and problem metadata
      getActiveCodeAndLanguage().then((codeInfo) => {
        try {
          const details = extractProblemDetails();
          details.extractedCode = codeInfo.code;
          details.extractedLanguage = codeInfo.language;

          // Trigger background auto sync
          chrome.runtime.sendMessage({
            action: "triggerAutoSync",
            problemKey: currentProblemKey,
            payload: {
              title: details.title,
              url: details.url,
              difficulty: details.difficulty,
              status: "Accepted",
              language: details.extractedLanguage,
              code: details.extractedCode,
              company: finalCompany,
              challenge: finalChallenge,
              day: finalDay,
              pattern: finalPattern,
              sheet: finalSheet
            }
          }, (response) => {
            // Release lock once background script returns response
            activeSyncLocks.delete(currentProblemKey);
            console.log(`[Auto Sync] Lock released for ${currentProblemKey}`);
            
            if (chrome.runtime.lastError) {
              console.warn("[Auto Sync] Error receiving background response:", chrome.runtime.lastError.message);
            }
          });
        } catch (error) {
          console.error("LeetCode Tracker [Auto Sync]: Error preparing auto sync payload:", error);
          
          // Release lock on error
          activeSyncLocks.delete(currentProblemKey);
          console.log(`[Auto Sync] Lock released for ${currentProblemKey}`);

          // Set to failed in storage
          if (!existing.contexts) {
            existing.contexts = {};
          }
          existing.contexts[currentContext] = {
            syncState: "failed",
            syncError: error.message,
            timestamp: new Date().toISOString()
          };

          chrome.storage.local.set({
            [currentProblemKey]: {
              ...existing,
              status: "Accepted",
              company: finalCompany,
              challenge: finalChallenge,
              day: finalDay,
              pattern: finalPattern,
              sheet: finalSheet,
              timestamp: new Date().toISOString()
            }
          });
        }
      });
    });
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
extractMetadataFromUrl();

// --- Code Extraction MVP Logic ---



// Deep query selector that traverses shadow roots and accessible iframes
function deepQuerySelector(selector) {
  function search(node) {
    if (!node) return null;
    
    // Test standard selector
    if (node.querySelector) {
      const match = node.querySelector(selector);
      if (match) return match;
    }
    
    // Traverse shadow roots
    if (node.shadowRoot) {
      const match = search(node.shadowRoot);
      if (match) return match;
    }
    
    // Traverse accessible same-origin iframes
    if (node.tagName === 'IFRAME') {
      try {
        if (node.contentDocument && node.contentDocument.documentElement) {
          const match = search(node.contentDocument.documentElement);
          if (match) return match;
        }
      } catch (e) {}
    }
    
    // Traverse standard children
    const children = node.children || node.childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 1) {
          const match = search(children[i]);
          if (match) return match;
        }
      }
    }
    
    return null;
  }
  
  return search(document.documentElement);
}

// Deep query selector all that aggregates matches across shadow roots and accessible iframes
function deepQuerySelectorAll(selector) {
  const matches = [];
  
  function search(node) {
    if (!node) return;
    
    if (node.querySelectorAll) {
      const found = node.querySelectorAll(selector);
      found.forEach(m => matches.push(m));
    }
    
    if (node.shadowRoot) {
      search(node.shadowRoot);
    }
    
    if (node.tagName === 'IFRAME') {
      try {
        if (node.contentDocument && node.contentDocument.documentElement) {
          search(node.contentDocument.documentElement);
        }
      } catch (e) {}
    }
    
    const children = node.children || node.childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 1) {
          search(children[i]);
        }
      }
    }
  }
  
  search(document.documentElement);
  return matches;
}

// DOM Inspector Utility to scan iframes, contenteditables, textareas, and shadow roots
function runDOMInspector() {
  console.log("\n=========================================");
  console.log("🔍 STARTING LEETCODE TRACKER DOM INSPECTOR");
  console.log("=========================================");

  // 1. Log all iframes
  const iframes = Array.from(document.querySelectorAll('iframe'));
  console.log(`\n--- Found ${iframes.length} iframes ---`);
  iframes.forEach((iframe, i) => {
    let accessible = false;
    let docInfo = "Not accessible (cross-origin)";
    try {
      if (iframe.contentDocument) {
        accessible = true;
        docInfo = `Accessible. Children count: ${iframe.contentDocument.body ? iframe.contentDocument.body.children.length : 0}`;
      }
    } catch (e) {
      docInfo = `Access blocked: ${e.message}`;
    }
    console.log(`[Iframe ${i}] ID: "${iframe.id}" | Class: "${iframe.className}" | Src: "${iframe.src}" | Access: ${docInfo}`);
  });

  const contenteditables = [];
  const textareas = [];
  const shadowRootsFound = [];

  // Recursive traversal function
  function traverse(element) {
    if (!element) return;

    // Check contenteditable
    if (element.hasAttribute && (element.hasAttribute('contenteditable') || element.getAttribute('contenteditable') === 'true')) {
      contenteditables.push(element);
    }

    // Check textarea
    if (element.tagName === 'TEXTAREA') {
      textareas.push(element);
    }

    // Check shadow root
    if (element.shadowRoot) {
      shadowRootsFound.push(element);
      traverse(element.shadowRoot);
    }

    // Check accessible iframe content
    if (element.tagName === 'IFRAME') {
      try {
        if (element.contentDocument && element.contentDocument.documentElement) {
          traverse(element.contentDocument.documentElement);
        }
      } catch (e) {}
    }

    // Traverse children
    const children = element.children || element.childNodes;
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 1 || children[i].nodeType === 11) {
          traverse(children[i]);
        }
      }
    }
  }

  // Traverse starting from root element
  traverse(document.documentElement);

  // 2. Log contenteditable nodes
  console.log(`\n--- Found ${contenteditables.length} contenteditable nodes ---`);
  contenteditables.forEach((el, i) => {
    const text = el.innerText || el.textContent || "";
    const preview = text.substring(0, 200).replace(/\n/g, ' ↵ ');
    console.log(`[ContentEditable ${i}] Tag: ${el.tagName} | ID: "${el.id}" | Class: "${el.className}" | Length: ${text.length}`);
    console.log(`  Preview (first 200 chars): "${preview}"`);
  });

  // 3. Log textareas
  console.log(`\n--- Found ${textareas.length} textareas ---`);
  textareas.forEach((el, i) => {
    const val = el.value || "";
    const preview = val.substring(0, 200).replace(/\n/g, ' ↵ ');
    console.log(`[Textarea ${i}] ID: "${el.id}" | Class: "${el.className}" | Length: ${val.length}`);
    console.log(`  Preview (first 200 chars): "${preview}"`);
  });

  // 4. Log shadow roots
  console.log(`\n--- Found ${shadowRootsFound.length} elements with Shadow Roots ---`);
  shadowRootsFound.forEach((el, i) => {
    console.log(`[Shadow Root Host ${i}] Tag: ${el.tagName} | ID: "${el.id}" | Class: "${el.className}"`);
    // Try scanning for CodeMirror/Monaco components inside the shadow root
    const cm = el.shadowRoot.querySelector('.cm-editor, .cm-content, .cm-line');
    const mon = el.shadowRoot.querySelector('.monaco-editor, .view-lines, .view-line');
    if (cm) {
      console.log(`  -> 🎉 FOUND CodeMirror inside this shadow root! Selector: ${cm.className}`);
    }
    if (mon) {
      console.log(`  -> 🎉 FOUND Monaco inside this shadow root! Selector: ${mon.className}`);
    }
  });

  console.log("=========================================\n");
}

// Helper to check editor type using deep boundaries
function detectEditorType() {
  const isMonaco = deepQuerySelector('.monaco-editor, .view-lines, .view-line') !== null;
  const isCodeMirror = deepQuerySelector('.cm-editor, .cm-content, .cm-line, .CodeMirror, .CodeMirror-code') !== null;
  
  if (isMonaco) return "Monaco Editor";
  if (isCodeMirror) return "CodeMirror";
  
  const isCustom = deepQuerySelector('[class*="editor"], [id*="editor"]') !== null;
  if (isCustom) return "LeetCode Custom Editor";
  
  return "Unknown Editor";
}

// Helper to log candidate DOM nodes using deep boundaries
function logEditorDOMNodes() {
  console.log("LeetCode Tracker [Debug]: Scanning for editor candidate DOM nodes:");
  
  const selectors = {
    'Monaco container': '.monaco-editor',
    'Monaco lines': '.view-lines',
    'Monaco single line': '.view-line',
    'CodeMirror 6 container': '.cm-editor',
    'CodeMirror 6 content': '.cm-content',
    'CodeMirror 6 line': '.cm-line',
    'CodeMirror 5 container': '.CodeMirror',
    'CodeMirror 5 lines': '.CodeMirror-code',
    'CodeMirror 5 line': '.CodeMirror-line',
    'General editor class': '[class*="editor"]',
    'General editor id': '[id*="editor"]',
    'Input textarea': 'textarea.inputarea'
  };

  for (const [name, selector] of Object.entries(selectors)) {
    const el = deepQuerySelector(selector);
    console.log(`- Selector "${selector}" (${name}):`, el ? `FOUND (${el.tagName}${el.className ? '.' + el.className.split(' ').join('.') : ''})` : 'NOT FOUND');
  }
}

// Helper to map Monaco language IDs to human-readable names
function mapLanguageId(langId) {
  if (!langId) return null;
  const id = langId.toLowerCase();
  
  const langMap = {
    'cpp': 'C++',
    'cplusplus': 'C++',
    'java': 'Java',
    'python': 'Python3',
    'python3': 'Python3',
    'csharp': 'C#',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'go': 'Go',
    'golang': 'Go',
    'rust': 'Rust',
    'c': 'C',
    'ruby': 'Ruby',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'scala': 'Scala',
    'php': 'PHP'
  };

  return langMap[id] || capitalize(langId);
}

// Fallback to reading Monaco DOM lines or textareas
function getMonacoDOMFallback() {
  console.log("LeetCode Tracker [Debug]: Running Monaco DOM fallbacks...");
  
  // Strategy 1: Monaco DOM lines
  const monacoLines = deepQuerySelectorAll('.view-line');
  if (monacoLines.length > 0) {
    const code = monacoLines.map(line => line.textContent).join('\n');
    if (code.trim().length > 0) {
      console.log(`LeetCode Tracker [Debug]: Code extracted via Monaco DOM lines (.view-line). Length: ${code.length}`);
      return code;
    }
  }

  // Strategy 2: Textarea checks
  const textareas = deepQuerySelectorAll('textarea');
  for (const ta of textareas) {
    if (ta.className.includes('inputarea') || ta.className.includes('code') || ta.id.includes('editor')) {
      const code = ta.value || "";
      if (code.trim().length > 0) {
        console.log(`LeetCode Tracker [Debug]: Code extracted via textarea (${ta.className}). Length: ${code.length}`);
        return code;
      }
    }
  }
  
  if (textareas.length > 0) {
    const code = textareas[0].value || "";
    if (code.trim().length > 0) {
      console.log(`LeetCode Tracker [Debug]: Code extracted via first fallback textarea. Length: ${code.length}`);
      return code;
    }
  }

  return "";
}

// Fallback to scanning page headers/buttons for select language name (piercing shadow boundaries)
function getDOMSelectedLanguage() {
  console.log("LeetCode Tracker [Debug]: Scanning for language selectors in DOM...");
  const knownLanguages = [
    "C++", "Java", "Python", "Python3", "C#", "JavaScript", "TypeScript", 
    "Go", "Rust", "C", "Ruby", "Swift", "Kotlin", "Scala", "PHP", 
    "Racket", "Erlang", "Elixir", "Dart"
  ];
  
  const candidates = [];
  
  // Look in editor toolbar / header areas first
  const toolbarContainer = deepQuerySelector('[class*="editor-header"], [class*="toolbar"], [class*="menu"], [class*="ControlPanel"], [class*="navigation"]');
  if (toolbarContainer) {
    const buttons = Array.from(toolbarContainer.querySelectorAll('button, span, p, a, div[class*="select"]'));
    for (const btn of buttons) {
      const txt = btn.textContent.trim();
      if (knownLanguages.includes(txt)) {
        candidates.push({ source: 'Toolbar Container', text: txt, element: btn });
      }
    }
  }

  // Scan generic buttons
  const buttons = deepQuerySelectorAll('button');
  for (const btn of buttons) {
    const txt = btn.textContent.trim();
    if (knownLanguages.includes(txt)) {
      candidates.push({ source: 'Generic Button', text: txt, element: btn });
    }
  }

  // Scan divs containing "select" class
  const selects = deepQuerySelectorAll('div[class*="select"], div[class*="Select"]');
  for (const sel of selects) {
    const txt = sel.textContent.trim();
    if (knownLanguages.includes(txt)) {
      candidates.push({ source: 'Select Element', text: txt, element: sel });
    }
  }

  // Scan span/p tags
  const textElements = deepQuerySelectorAll('span, p');
  for (const el of textElements) {
    const txt = el.textContent.trim();
    if (knownLanguages.includes(txt)) {
      candidates.push({ source: 'Span/P Element', text: txt, element: el });
    }
  }

  // Log candidates
  console.log(`LeetCode Tracker [Debug]: Found ${candidates.length} language selector candidate elements:`);
  candidates.forEach((c, index) => {
    console.log(`  [${index}] Source: ${c.source} | Text: "${c.text}"`);
  });

  // Return the first valid candidate (prioritising toolbar)
  const priorityCandidate = candidates.find(c => c.source === 'Toolbar Container') || candidates[0];
  if (priorityCandidate) {
    console.log(`LeetCode Tracker [Debug]: Selecting language: "${priorityCandidate.text}"`);
    return priorityCandidate.text;
  }

  console.warn("LeetCode Tracker [Debug]: No language selectors matched in DOM.");
  return null;
}

// Query CodeMirror 6 or fall back to Monaco editor (incorporating diagnostics and logs)
function getActiveCodeAndLanguage() {
  return new Promise((resolve) => {
    console.log("\n--- LeetCode Tracker Code Extraction Triggered ---");
    
    // Run diagnostics
    try {
      runDOMInspector();
    } catch (e) {
      console.error("LeetCode Tracker [Debug]: Error running DOM Inspector utility:", e);
    }

    const hasMonaco = deepQuerySelector('.monaco-editor') !== null;
    console.log(`Monaco detected: ${hasMonaco}`);

    if (hasMonaco) {
      const handleMessage = (event) => {
        if (event.source !== window) return;
        if (event.data && event.data.type === 'RESPONSE_MONACO_CODE') {
          window.removeEventListener('message', handleMessage);
          clearTimeout(timeout);
          const resolvedLang = mapLanguageId(event.data.languageId);
          
          console.log(`Models found: ${event.data.modelsCount}`);
          console.log(`Selected model length: ${event.data.code.length}`);
          
          resolve({
            code: event.data.code,
            language: resolvedLang
          });
        } else if (event.data && event.data.type === 'RESPONSE_MONACO_CODE_FAILED') {
          window.removeEventListener('message', handleMessage);
          clearTimeout(timeout);
          console.log(`Models found: 0`);
          console.log("LeetCode Tracker [Debug]: Monaco model query failed in page context. Executing fallbacks.");
          runFallbackFlow(resolve);
        }
      };

      window.addEventListener('message', handleMessage);

      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        console.warn("LeetCode Tracker [Debug]: Monaco code extraction response timed out (150ms). Executing fallbacks.");
        runFallbackFlow(resolve);
      }, 150);

      // Inject the pageBridge.js file to execute in the page context safely
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('pageBridge.js');
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      return;
    }

    // Monaco not present, run fallback directly
    runFallbackFlow(resolve);

    function runFallbackFlow(resolvePromise) {
      // Check if the currently focused element is a CodeMirror content area
      let activeEl = document.activeElement;
      let deepActiveEl = activeEl;
      while (deepActiveEl && deepActiveEl.shadowRoot && deepActiveEl.shadowRoot.activeElement) {
        deepActiveEl = deepActiveEl.shadowRoot.activeElement;
      }

      const hasCMClass = (el) => el && el.classList && el.classList.contains('cm-content');

      if (hasCMClass(activeEl) || hasCMClass(deepActiveEl)) {
        const targetEl = hasCMClass(activeEl) ? activeEl : deepActiveEl;
        console.log("LeetCode Tracker [Debug]: Active element is CodeMirror content area.");
        const activeCode = targetEl.innerText || "";
        const language = getDOMSelectedLanguage() || "Unknown";
        
        console.log(`Found CodeMirror instances: N/A (Using activeElement)`);
        console.log(`Selected editor index: activeElement`);
        console.log(`Code length: ${activeCode.length}`);
        
        resolvePromise({
          code: activeCode,
          language: language
        });
        return;
      }

      // Fallback: Scan all .cm-content instances
      const cmInstances = deepQuerySelectorAll('.cm-content');
      if (cmInstances.length > 0) {
        console.log(`Found CodeMirror instances: ${cmInstances.length}`);
        
        let activeCode = "";
        let selectedIdx = -1;
        
        const candidates = cmInstances.map((inst, idx) => {
          const text = inst.innerText || inst.textContent || "";
          const rect = inst.getBoundingClientRect();
          
          let isVisible = rect.width > 0 && rect.height > 0;
          try {
            const style = window.getComputedStyle(inst);
            if (style.display === 'none' || style.visibility === 'hidden') {
              isVisible = false;
            }
          } catch (e) {}
          
          const isEditable = inst.getAttribute('contenteditable') === 'true' && inst.getAttribute('aria-readonly') !== 'true';
          
          console.log(`LeetCode Tracker [Debug]: CodeMirror instance [${idx}] - Length: ${text.length}, Editable: ${isEditable}, Visible: ${isVisible}`);
          
          return {
            index: idx,
            text: text,
            length: text.length,
            isEditable: isEditable,
            isVisible: isVisible
          };
        });
        
        // Filter according to preferences:
        // 1. Visible & Editable
        let filtered = candidates.filter(c => c.isEditable && c.isVisible);
        let strategy = "Visible & Editable";
        
        // 2. Fallback to Editable only if no Visible & Editable
        if (filtered.length === 0) {
          filtered = candidates.filter(c => c.isEditable);
          strategy = "Editable only (Fallback)";
        }
        
        // 3. Fallback to any if none editable
        if (filtered.length === 0) {
          filtered = candidates;
          strategy = "All instances (Fallback)";
        }
        
        if (filtered.length > 0) {
          // Find the largest one
          let best = filtered[0];
          for (let i = 1; i < filtered.length; i++) {
            if (filtered[i].length > best.length) {
              best = filtered[i];
            }
          }
          selectedIdx = best.index;
          activeCode = best.text;
          console.log(`LeetCode Tracker [Debug]: Selection strategy: ${strategy}`);
        }
        
        console.log(`Selected editor index: ${selectedIdx}`);
        console.log(`Code length: ${activeCode.length}`);
        
        const language = getDOMSelectedLanguage() || "Unknown";
        console.log(`LeetCode Tracker [Debug]: Language detected = ${language}`);
        
        resolvePromise({
          code: activeCode,
          language: language
        });
        return;
      }

      // If no CodeMirror found at all, try Monaco DOM fallback
      const fallbackCode = getMonacoDOMFallback();
      const fallbackLang = getDOMSelectedLanguage() || "Unknown";
      console.log(`LeetCode Tracker [Debug]: Monaco DOM Fallback results - Code Length: ${fallbackCode.length} | Language detected: ${fallbackLang}`);
      
      resolvePromise({
        code: fallbackCode,
        language: fallbackLang
      });
    }
  });
}

