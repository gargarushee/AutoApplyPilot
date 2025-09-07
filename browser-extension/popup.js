// JobFlow Auto-Fill Extension Popup

class JobFlowPopup {
  constructor() {
    this.resumeData = null;
    this.currentTab = null;
  }

  async init() {
    await this.getCurrentTab();
    await this.loadResumeData();
    await this.checkPageStatus();
    this.setupEventListeners();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  async loadResumeData() {
    try {
      // Use Chrome messaging to get resume data from background script (avoids CORS)
      const response = await chrome.runtime.sendMessage({ action: 'getResumeData' });
      
      if (response && response.success && response.data) {
        if (response.data.error) {
          this.showState('no-resume');
          return;
        }
        this.resumeData = response.data;
        this.showState('ready');
        this.updateResumeInfo();
      } else {
        this.showState('no-resume');
      }
    } catch (error) {
      console.error('Failed to load resume data:', error);
      this.showState('error');
    }
  }

  async checkPageStatus() {
    if (!this.currentTab || !this.resumeData) return;

    try {
      // Inject content script to check for forms
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: this.checkForJobForms
      });

      const pageInfo = results[0].result;
      this.updatePageStatus(pageInfo);
    } catch (error) {
      console.error('Failed to check page status:', error);
      this.updatePageStatus({ isJobPage: false, formsFound: 0 });
    }
  }

  checkForJobForms() {
    // This function runs in the context of the web page
    const url = window.location.href.toLowerCase();
    const content = document.body?.textContent?.toLowerCase() || '';
    
    const jobKeywords = [
      'careers', 'jobs', 'apply', 'application', 'position', 'employment',
      'lever.co', 'greenhouse.io', 'workday.com', 'jobvite.com', 'breezy.hr'
    ];
    
    const formKeywords = [
      'resume', 'cv', 'first name', 'last name', 'email', 'phone',
      'cover letter', 'experience', 'skills', 'education'
    ];
    
    const isJobPage = jobKeywords.some(keyword => url.includes(keyword)) ||
                     formKeywords.some(keyword => content.includes(keyword));
    
    const forms = document.querySelectorAll('form');
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
    
    return {
      isJobPage,
      formsFound: forms.length,
      inputsFound: inputs.length,
      url: window.location.href
    };
  }

  showState(state) {
    // Hide all states
    document.querySelectorAll('.state-container, .loading-state').forEach(el => {
      el.style.display = 'none';
    });

    // Show specific state
    const stateMap = {
      'loading': 'loading-state',
      'no-resume': 'no-resume-state',
      'ready': 'ready-state',
      'error': 'error-state'
    };

    const elementId = stateMap[state];
    if (elementId) {
      document.getElementById(elementId).style.display = 'block';
    }
  }

  updateResumeInfo() {
    if (!this.resumeData) return;

    document.getElementById('resume-name').textContent = this.resumeData.filename || 'Unknown Resume';
    document.getElementById('resume-user').textContent = 
      `${this.resumeData.fullName || 'Unknown'} • ${this.resumeData.email || 'No email'}`;
  }

  updatePageStatus(pageInfo) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const autoFillBtn = document.getElementById('auto-fill-btn');
    const statsElement = document.getElementById('stats');

    if (pageInfo.isJobPage && pageInfo.formsFound > 0) {
      statusIndicator.className = 'status-indicator ready';
      statusText.textContent = 'Job application page detected';
      autoFillBtn.disabled = false;
      
      // Show stats
      document.getElementById('forms-found').textContent = pageInfo.formsFound;
      statsElement.style.display = 'flex';
    } else if (pageInfo.isJobPage) {
      statusIndicator.className = 'status-indicator warning';
      statusText.textContent = 'Job page detected, no forms found';
      autoFillBtn.disabled = true;
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Not a job application page';
      autoFillBtn.disabled = true;
    }
  }

  setupEventListeners() {
    // Auto-fill button
    document.getElementById('auto-fill-btn').addEventListener('click', async () => {
      await this.triggerAutoFill();
    });

    // Preview button
    document.getElementById('preview-btn').addEventListener('click', () => {
      this.showPreview();
    });

    // Dashboard links
    document.getElementById('open-dashboard-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5000' });
    });

    document.getElementById('dashboard-link').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5000' });
    });

    // Retry button
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.init();
    });
  }

  async triggerAutoFill() {
    if (!this.currentTab) return;

    const button = document.getElementById('auto-fill-btn');
    button.disabled = true;
    button.textContent = 'Filling...';

    try {
      // Inject and run auto-fill script
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: this.executeAutoFill,
        args: [this.resumeData]
      });

      const filledCount = results[0].result;
      document.getElementById('fields-filled').textContent = filledCount;

      // Success feedback
      button.textContent = '✓ Filled!';
      button.style.background = '#10b981';
      
      setTimeout(() => {
        button.textContent = 'Auto-Fill Forms';
        button.style.background = '';
        button.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Auto-fill failed:', error);
      button.textContent = 'Failed';
      button.style.background = '#ef4444';
      
      setTimeout(() => {
        button.textContent = 'Auto-Fill Forms';
        button.style.background = '';
        button.disabled = false;
      }, 2000);
    }
  }

  executeAutoFill(resumeData) {
    // This function runs in the context of the web page
    let totalFilled = 0;
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
      const fieldMappings = [
        { 
          selectors: ['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="first" i]'], 
          value: resumeData.firstName
        },
        { 
          selectors: ['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last" i]'], 
          value: resumeData.lastName
        },
        { 
          selectors: ['input[name*="name" i]:not([name*="first" i]):not([name*="last" i])', 'input[id*="name" i]'], 
          value: resumeData.fullName
        },
        { 
          selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'], 
          value: resumeData.email
        },
        { 
          selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], 
          value: resumeData.phone
        },
        { 
          selectors: ['textarea[name*="experience" i]', 'textarea[id*="experience" i]'], 
          value: resumeData.experience
        },
        { 
          selectors: ['textarea[name*="skill" i]', 'textarea[id*="skill" i]'], 
          value: Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills
        }
      ];

      fieldMappings.forEach(mapping => {
        if (!mapping.value) return;

        mapping.selectors.forEach(selector => {
          const fields = form.querySelectorAll(selector);
          fields.forEach(field => {
            if (field.value.trim()) return; // Skip filled fields
            
            field.value = mapping.value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            totalFilled++;
          });
        });
      });
    });

    return totalFilled;
  }

  showPreview() {
    if (!this.resumeData) return;

    const preview = `
Name: ${this.resumeData.fullName}
Email: ${this.resumeData.email}
Phone: ${this.resumeData.phone}
Skills: ${Array.isArray(this.resumeData.skills) ? this.resumeData.skills.join(', ') : this.resumeData.skills}
Experience: ${this.resumeData.experience ? this.resumeData.experience.substring(0, 100) + '...' : 'Not available'}
    `;

    alert(preview);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new JobFlowPopup();
  popup.init();
});