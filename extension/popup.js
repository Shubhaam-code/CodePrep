// popup.js - Handles extension popup interactions

document.addEventListener("DOMContentLoaded", () => {
  const activeState = document.getElementById("active-state");
  const inactiveState = document.getElementById("inactive-state");
  
  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");
  
  const questionId = document.getElementById("question-id");
  const difficultyPill = document.getElementById("difficulty-pill");
  const questionTitle = document.getElementById("question-title");
  const questionLink = document.getElementById("question-link");
  const urlText = document.getElementById("url-text");
  
  // Submission Status Elements
  const submissionStatus = document.getElementById("submission-status");
  let currentProblemKey = null;
  
  // Sync Elements
  const syncContainer = document.getElementById("sync-container");
  const syncButton = document.getElementById("sync-button");
  const syncFeedback = document.getElementById("sync-feedback");
  let activeQuestionData = null;

  function updateSubmissionStatusDisplay(status) {
    if (!submissionStatus) return;
    if (status === "Accepted") {
      submissionStatus.textContent = "Accepted";
      submissionStatus.className = "status-value accepted";
      if (syncContainer) syncContainer.classList.remove("hidden");
    } else {
      submissionStatus.textContent = "Not Accepted Yet";
      submissionStatus.className = "status-value not-accepted";
      if (syncContainer) syncContainer.classList.add("hidden");
    }
  }

  function updateSyncButtonUI(syncState, syncError) {
    if (!syncButton) return;
    const btnTextEl = syncButton.querySelector(".btn-text");
    const btnIconEl = syncButton.querySelector(".btn-icon");

    if (syncState === "synced") {
      syncButton.disabled = true;
      if (btnTextEl) btnTextEl.textContent = "Synced";
      if (btnIconEl) btnIconEl.textContent = "✅";
      
      if (syncFeedback) {
        syncFeedback.textContent = "Synced to CodePrep successfully!";
        syncFeedback.className = "sync-feedback success";
        syncFeedback.classList.remove("hidden");
      }
    } else if (syncState === "syncing") {
      syncButton.disabled = true;
      if (btnTextEl) btnTextEl.textContent = "Syncing...";
      if (btnIconEl) btnIconEl.textContent = "⌛";
      if (syncFeedback) syncFeedback.classList.add("hidden");
    } else if (syncState === "pending_auth") {
      syncButton.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "Sync To CodePrep";
      if (btnIconEl) btnIconEl.textContent = "🔄";
      
      if (syncFeedback) {
        syncFeedback.textContent = syncError || "Please login to CodePrep website first.";
        syncFeedback.className = "sync-feedback error";
        syncFeedback.classList.remove("hidden");
      }
    } else if (syncState === "failed") {
      syncButton.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "Sync To CodePrep";
      if (btnIconEl) btnIconEl.textContent = "🔄";
      
      if (syncFeedback) {
        syncFeedback.textContent = syncError || "Sync failed.";
        syncFeedback.className = "sync-feedback error";
        syncFeedback.classList.remove("hidden");
      }
    } else {
      syncButton.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "Sync To CodePrep";
      if (btnIconEl) btnIconEl.textContent = "🔄";
      if (syncFeedback) syncFeedback.classList.add("hidden");
    }
  }

  function getProblemKey(urlStr) {
    try {
      const urlObj = new URL(urlStr);
      const match = urlObj.pathname.match(/\/problems\/([^/]+)/);
      if (match) {
        return `leetcode_problem_${match[1]}`;
      }
    } catch (e) {}
    return `leetcode_problem_${urlStr}`;
  }

  // Listen for storage changes to auto-update the popup UI reactively
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && currentProblemKey && changes[currentProblemKey]) {
      const newValue = changes[currentProblemKey].newValue;
      if (newValue && newValue.status === "Accepted") {
        updateSubmissionStatusDisplay("Accepted");
        updateSyncButtonUI(newValue.syncState, newValue.syncError);
      }
    }
  });

  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      showInactiveState();
      return;
    }

    const activeTab = tabs[0];
    const url = activeTab.url || "";

    // Check if the user is on a LeetCode problem page
    const isLeetCodeProblem = url.includes("leetcode.com/problems/");

    if (!isLeetCodeProblem) {
      showInactiveState();
      return;
    }

    // Set connection status to active since we are on LeetCode
    setConnectedStatus(true);

    // Resolve storage key and check initial submission status
    currentProblemKey = getProblemKey(url);
    chrome.storage.local.get([currentProblemKey], (result) => {
      const data = result[currentProblemKey];
      if (data && data.status === "Accepted") {
        updateSubmissionStatusDisplay("Accepted");
        updateSyncButtonUI(data.syncState, data.syncError);
      } else {
        updateSubmissionStatusDisplay("Not Accepted Yet");
      }
    });

    // Send a message to the content script of the active tab to extract details
    chrome.tabs.sendMessage(activeTab.id, { action: "getProblemDetails" }, (response) => {
      // Handle the case where the content script hasn't loaded yet or failed
      if (chrome.runtime.lastError || !response || !response.success) {
        console.warn("Could not communicate with content script. Retrying or showing fallback.", chrome.runtime.lastError);
        // Display fallback details from the tab information itself
        displayFallbackDetails(activeTab);
      } else {
        // Display details returned from content script
        displayDetails(response.data);
      }
    });
  });

  function setConnectedStatus(isConnected) {
    if (isConnected) {
      statusBadge.classList.add("connected");
      statusText.textContent = "Connected";
    } else {
      statusBadge.classList.remove("connected");
      statusText.textContent = "Disconnected";
    }
  }

  function showInactiveState() {
    activeState.classList.add("hidden");
    inactiveState.classList.remove("hidden");
    setConnectedStatus(false);
  }

  function displayDetails(data) {
    inactiveState.classList.add("hidden");
    activeState.classList.remove("hidden");

    // Save active question metadata for the sync payload
    activeQuestionData = data;

    // Display question ID if available
    if (data.leetcodeId) {
      questionId.textContent = `#${data.leetcodeId}`;
      questionId.style.display = "inline";
    } else {
      questionId.style.display = "none";
    }

    // Display Title
    questionTitle.textContent = data.title;

    // Display URL
    questionLink.href = data.url;
    urlText.textContent = cleanUrlDisplay(data.url);

    // Display Difficulty Pill
    const diff = (data.difficulty || "Unknown").toLowerCase();
    difficultyPill.textContent = data.difficulty;
    difficultyPill.className = "difficulty-pill"; // reset
    
    if (diff === "easy" || diff === "medium" || diff === "hard") {
      difficultyPill.classList.add(diff);
      difficultyPill.style.display = "inline-block";
    } else {
      difficultyPill.style.display = "none";
    }

    // Render Code Preview Details (MVP)
    const codeLang = document.getElementById("code-lang");
    const codeLength = document.getElementById("code-length");
    const codePreview = document.getElementById("code-preview");

    console.log("LeetCode Tracker: Rendering code details in popup:", {
      lang: data.extractedLanguage,
      codeLen: data.extractedCode ? data.extractedCode.length : 0
    });

    if (codeLang) {
      codeLang.textContent = data.extractedLanguage || "Unknown";
    }
    if (codeLength) {
      const len = data.extractedCode ? data.extractedCode.length : 0;
      codeLength.textContent = `${len} chars`;
    }
    if (codePreview) {
      if (data.extractedCode && data.extractedCode.trim()) {
        const cleanCode = data.extractedCode.trim();
        const previewText = cleanCode.length > 100 
          ? cleanCode.substring(0, 100) + "\n..." 
          : cleanCode;
        codePreview.textContent = previewText;
      } else {
        codePreview.textContent = "No code draft found in editor.";
      }
    }
  }

  function displayFallbackDetails(tab) {
    // Generate fallback data from tab title and url
    const url = tab.url || "";
    const tabTitle = tab.title || "";
    
    // Parse title
    let title = tabTitle;
    const titleMatch = tabTitle.match(/^(.+?)(?:\s*-\s*LeetCode.*)?$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    let leetcodeId = null;
    let cleanTitle = title;
    const idMatch = title.match(/^(\d+)\.\s*(.+)$/);
    if (idMatch) {
      leetcodeId = parseInt(idMatch[1], 10);
      cleanTitle = idMatch[2].trim();
    }

    displayDetails({
      leetcodeId,
      title: cleanTitle,
      url,
      difficulty: "Unknown" // Difficulty is DOM-dependent, fallback doesn't know it
    });
  }

  function cleanUrlDisplay(urlStr) {
    try {
      const urlObj = new URL(urlStr);
      // Display path like leetcode.com/problems/two-sum
      return urlObj.hostname + urlObj.pathname.replace(/\/$/, "");
    } catch (e) {
      return urlStr;
    }
  }

  // Add Event Listener to the Sync Button
  if (syncButton) {
    syncButton.addEventListener("click", () => {
      if (!activeQuestionData) return;

      // Enable loading state
      updateSyncButtonUI("syncing");

      // Payload configuration
      const payload = {
        title: activeQuestionData.title,
        url: activeQuestionData.url,
        difficulty: activeQuestionData.difficulty || "Unknown",
        status: "Accepted",
        language: activeQuestionData.extractedLanguage || "Unknown",
        code: activeQuestionData.extractedCode || ""
      };

      // POST to backend API
      chrome.storage.local.get(["token"], (result) => {
        const token = result.token;
        if (!token) {
          chrome.storage.local.get([currentProblemKey], (storeResult) => {
            const data = storeResult[currentProblemKey] || { status: "Accepted" };
            data.syncState = "pending_auth";
            data.syncError = "Please login to CodePrep website first.";
            chrome.storage.local.set({ [currentProblemKey]: data }, () => {
              updateSyncButtonUI("pending_auth", data.syncError);
            });
          });
          return;
        }

        fetch(`${CONFIG.API_BASE_URL}/api/extension/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })
        .then(async response => {
          if (response.status === 401) {
            throw new Error("Unauthorized. Please login to CodePrep website again.");
          }
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(res => {
          chrome.storage.local.get([currentProblemKey], (storeResult) => {
            const data = storeResult[currentProblemKey] || { status: "Accepted" };
            data.syncState = "synced";
            delete data.syncError;
            chrome.storage.local.set({ [currentProblemKey]: data }, () => {
              updateSyncButtonUI("synced");
            });
          });
        })
        .catch(err => {
          console.error("Sync to CodePrep failed:", err);
          chrome.storage.local.get([currentProblemKey], (storeResult) => {
            const data = storeResult[currentProblemKey] || { status: "Accepted" };
            
            let state = "failed";
            let errorMsg = `Sync failed: ${err.message}`;
            if (err.message.includes("login") || err.message.includes("Unauthorized")) {
              state = "pending_auth";
              errorMsg = "Please login to CodePrep website first.";
            }

            data.syncState = state;
            data.syncError = errorMsg;
            chrome.storage.local.set({ [currentProblemKey]: data }, () => {
              updateSyncButtonUI(state, errorMsg);
            });
          });
        });
      });
    });
  }
});
