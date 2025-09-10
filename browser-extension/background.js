// JobFlow Auto-Fill Background Service Worker

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("JobFlow Auto-Fill extension installed");

  if (details.reason === "install") {
    // Open welcome page or dashboard
    chrome.tabs.create({
      url: "https://66b0dabc-42e9-4daf-ac7b-fcbb39401103-00-297d8ia1kql4j.worf.replit.dev/",
    });
  }

  // Create context menu
  chrome.contextMenus.create({
    id: "jobflow-autofill",
    title: "Auto-fill with JobFlow",
    contexts: ["page"],
    documentUrlPatterns: ["*://*/*"],
  });
});

// Listen for tab updates to detect job sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    checkIfJobSite(tab);
  }
});

// Check if the current tab is a job site
function checkIfJobSite(tab) {
  if (!tab.url) return;

  const jobSitePatterns = [
    /lever\.co/i,
    /greenhouse\.io/i,
    /workday\.com/i,
    /jobvite\.com/i,
    /breezy\.hr/i,
    /careers/i,
    /jobs/i,
    /apply/i,
    /application/i,
  ];

  const isJobSite = jobSitePatterns.some((pattern) => pattern.test(tab.url));

  if (isJobSite) {
    // Update extension icon to show it's active
    chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });
    chrome.action.setBadgeText({
      text: "●",
      tabId: tab.id,
    });

    console.log("Job site detected:", tab.url);
  } else {
    // Clear badge
    chrome.action.setBadgeText({
      text: "",
      tabId: tab.id,
    });
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  if (request.action === "getResumeData") {
    // Fetch resume data from JobFlow API
    fetch(
      "https://66b0dabc-42e9-4daf-ac7b-fcbb39401103-00-297d8ia1kql4j.worf.replit.dev/api/bookmarklet/resume-data",
    )
      .then((response) => response.json())
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }

  if (request.action === "autoFillComplete") {
    // Handle auto-fill completion
    console.log("Auto-fill completed:", request.data);
  }
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "jobflow-autofill") {
    // Trigger auto-fill via content script
    chrome.tabs.sendMessage(tab.id, { action: "triggerAutoFill" });
  }
});

// Keep service worker alive
self.addEventListener("message", () => {
  // Keep alive
});
