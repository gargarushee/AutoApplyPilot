// JobFlow Auto-Fill Background Service Worker

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('JobFlow Auto-Fill extension installed');
  
  if (details.reason === 'install') {
    // Open welcome page or dashboard
    chrome.tabs.create({
      url: 'http://localhost:5000'
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by the popup, but we can add additional logic here
  console.log('Extension icon clicked on tab:', tab.url);
});

// Listen for tab updates to detect job sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    checkIfJobSite(tab);
  }
});

// Check if the current tab is a job site
function checkIfJobSite(tab) {
  const jobSitePatterns = [
    /lever\.co/i,
    /greenhouse\.io/i,
    /workday\.com/i,
    /jobvite\.com/i,
    /breezy\.hr/i,
    /careers/i,
    /jobs/i,
    /apply/i,
    /application/i
  ];

  const isJobSite = jobSitePatterns.some(pattern => pattern.test(tab.url));
  
  if (isJobSite) {
    // Update extension icon to show it's active
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
    chrome.action.setBadgeText({ 
      text: '●',
      tabId: tab.id 
    });
    
    // Optional: Show notification
    console.log('Job site detected:', tab.url);
  } else {
    // Clear badge
    chrome.action.setBadgeText({ 
      text: '',
      tabId: tab.id 
    });
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'getResumeData') {
    // Fetch resume data from JobFlow API
    fetch('http://localhost:5000/api/bookmarklet/resume-data')
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'autoFillComplete') {
    // Handle auto-fill completion
    console.log('Auto-fill completed:', request.data);
    
    // Optional: Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'JobFlow Auto-Fill',
      message: `Auto-filled ${request.data.fieldsCount} form fields`
    });
  }
});

// Context menu for right-click auto-fill (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'jobflow-autofill',
    title: 'Auto-fill with JobFlow',
    contexts: ['page', 'selection'],
    documentUrlPatterns: ['*://*/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'jobflow-autofill') {
    // Trigger auto-fill via content script
    chrome.tabs.sendMessage(tab.id, { action: 'triggerAutoFill' });
  }
});

// Storage management
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();