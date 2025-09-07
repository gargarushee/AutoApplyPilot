// JobFlow Auto-Fill Content Script
// This script runs on every webpage to detect and auto-fill job application forms

class JobFlowAutoFill {
  constructor() {
    this.resumeData = null;
    this.ui = null;
    this.apiBase = 'http://localhost:5000'; // Default to localhost, can be configured
    this.isActive = false;
  }

  async init() {
    // Check if this looks like a job application page
    if (this.isJobApplicationPage()) {
      await this.loadResumeData();
      this.createFloatingButton();
      this.detectForms();
    }
  }

  isJobApplicationPage() {
    const url = window.location.href.toLowerCase();
    const content = document.body?.textContent?.toLowerCase() || '';
    
    // Check for job-related keywords in URL or content
    const jobKeywords = [
      'careers', 'jobs', 'apply', 'application', 'position', 'employment',
      'lever.co', 'greenhouse.io', 'workday.com', 'jobvite.com', 'breezy.hr'
    ];
    
    const formKeywords = [
      'resume', 'cv', 'first name', 'last name', 'email', 'phone',
      'cover letter', 'experience', 'skills', 'education'
    ];
    
    return jobKeywords.some(keyword => url.includes(keyword)) ||
           formKeywords.some(keyword => content.includes(keyword));
  }

  async loadResumeData() {
    try {
      const response = await fetch(`${this.apiBase}/api/bookmarklet/resume-data`);
      const data = await response.json();
      
      if (data.error) {
        console.warn('JobFlow: No resume data available');
        return;
      }
      
      this.resumeData = data;
    } catch (error) {
      console.error('JobFlow: Failed to load resume data', error);
    }
  }

  detectForms() {
    const forms = document.querySelectorAll('form');
    if (forms.length > 0 && this.resumeData) {
      console.log(`JobFlow: Detected ${forms.length} forms on this page`);
      this.showNotification(`Found ${forms.length} form(s) ready to auto-fill`);
    }
  }

  createFloatingButton() {
    if (this.ui || !this.resumeData) return;

    this.ui = document.createElement('div');
    this.ui.id = 'jobflow-floating-button';
    this.ui.innerHTML = `
      <div class="jobflow-fab" id="jobflow-fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
        <span>Auto-Fill</span>
      </div>
      
      <div class="jobflow-panel" id="jobflow-panel" style="display: none;">
        <div class="jobflow-header">
          <strong>JobFlow Auto-Fill</strong>
          <button id="jobflow-close">×</button>
        </div>
        <div class="jobflow-resume-info">
          <div class="jobflow-resume-name">${this.resumeData.filename}</div>
          <div class="jobflow-resume-details">${this.resumeData.fullName} • ${this.resumeData.email}</div>
        </div>
        <div class="jobflow-actions">
          <button id="jobflow-fill-btn" class="jobflow-btn-primary">Fill Forms</button>
          <button id="jobflow-preview-btn" class="jobflow-btn-secondary">Preview Data</button>
        </div>
        <div class="jobflow-status" id="jobflow-status"></div>
      </div>
    `;

    document.body.appendChild(this.ui);

    // Event listeners
    document.getElementById('jobflow-fab').addEventListener('click', () => this.togglePanel());
    document.getElementById('jobflow-close').addEventListener('click', () => this.hidePanel());
    document.getElementById('jobflow-fill-btn').addEventListener('click', () => this.autoFillForms());
    document.getElementById('jobflow-preview-btn').addEventListener('click', () => this.showPreview());
  }

  togglePanel() {
    const panel = document.getElementById('jobflow-panel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
  }

  hidePanel() {
    document.getElementById('jobflow-panel').style.display = 'none';
  }

  autoFillForms() {
    if (!this.resumeData) return;

    const forms = document.querySelectorAll('form');
    let totalFilled = 0;

    forms.forEach(form => {
      totalFilled += this.fillForm(form);
    });

    this.showStatus(`✓ Auto-filled ${totalFilled} fields`, 'success');
    
    // Show success animation
    const fillBtn = document.getElementById('jobflow-fill-btn');
    const originalText = fillBtn.textContent;
    fillBtn.textContent = '✓ Filled!';
    fillBtn.style.background = '#10b981';
    
    setTimeout(() => {
      fillBtn.textContent = originalText;
      fillBtn.style.background = '';
    }, 2000);
  }

  fillForm(form) {
    let filledCount = 0;
    
    const fieldMappings = [
      // Name fields
      { 
        selectors: ['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="first" i]'], 
        value: this.resumeData.firstName,
        type: 'firstName'
      },
      { 
        selectors: ['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last" i]'], 
        value: this.resumeData.lastName,
        type: 'lastName'
      },
      { 
        selectors: ['input[name*="name" i]:not([name*="first" i]):not([name*="last" i])', 'input[id*="name" i]', 'input[placeholder*="full name" i]'], 
        value: this.resumeData.fullName,
        type: 'fullName',
        priority: 'low'
      },
      
      // Contact fields
      { 
        selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'], 
        value: this.resumeData.email,
        type: 'email'
      },
      { 
        selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], 
        value: this.resumeData.phone,
        type: 'phone'
      },
      
      // Text areas
      { 
        selectors: ['textarea[name*="experience" i]', 'textarea[id*="experience" i]', 'textarea[placeholder*="experience" i]'], 
        value: this.resumeData.experience,
        type: 'experience'
      },
      { 
        selectors: ['textarea[name*="skill" i]', 'textarea[id*="skill" i]', 'textarea[placeholder*="skill" i]'], 
        value: Array.isArray(this.resumeData.skills) ? this.resumeData.skills.join(', ') : this.resumeData.skills,
        type: 'skills'
      },
      { 
        selectors: ['textarea[name*="education" i]', 'textarea[id*="education" i]', 'textarea[placeholder*="education" i]'], 
        value: this.resumeData.education,
        type: 'education'
      }
    ];

    fieldMappings.forEach(mapping => {
      if (!mapping.value) return;

      mapping.selectors.forEach(selector => {
        const fields = form.querySelectorAll(selector);
        fields.forEach(field => {
          // Skip if already filled (unless low priority)
          if (field.value.trim() && mapping.priority !== 'low') return;
          
          // Fill the field
          field.value = mapping.value;
          
          // Trigger events to ensure the form recognizes the change
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
          field.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Visual feedback
          field.style.backgroundColor = '#dcfce7';
          setTimeout(() => {
            field.style.backgroundColor = '';
          }, 1000);
          
          filledCount++;
        });
      });
    });

    return filledCount;
  }

  showPreview() {
    const preview = `
      <strong>Resume Data Preview:</strong><br>
      Name: ${this.resumeData.fullName}<br>
      Email: ${this.resumeData.email}<br>
      Phone: ${this.resumeData.phone}<br>
      Skills: ${Array.isArray(this.resumeData.skills) ? this.resumeData.skills.join(', ') : this.resumeData.skills}<br>
      Experience: ${this.resumeData.experience ? this.resumeData.experience.substring(0, 100) + '...' : 'Not available'}
    `;
    this.showStatus(preview, 'info');
  }

  showStatus(message, type = 'info') {
    const status = document.getElementById('jobflow-status');
    status.innerHTML = message;
    status.className = `jobflow-status ${type}`;
    
    setTimeout(() => {
      status.innerHTML = '';
      status.className = 'jobflow-status';
    }, 5000);
  }

  showNotification(message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'jobflow-notification';
    notification.textContent = `JobFlow: ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const autoFill = new JobFlowAutoFill();
    autoFill.init();
  });
} else {
  const autoFill = new JobFlowAutoFill();
  autoFill.init();
}