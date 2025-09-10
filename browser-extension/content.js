// JobFlow Auto-Fill Content Script
// This script runs on every webpage to detect and auto-fill job application forms

class JobFlowAutoFill {
  constructor() {
    this.resumeData = null;
    this.ui = null;
    this.isActive = false;
    this.observer = null;
    this.retryCount = 0;
    this.maxRetries = 10;
  }

  async init() {
    // Check if this looks like a job application page
    if (this.isJobApplicationPage()) {
      await this.loadResumeData();
      this.setupDynamicFormDetection();
      this.detectFormsWithRetry();
    }
  }

  isJobApplicationPage() {
    const url = window.location.href.toLowerCase();
    const content = document.body?.textContent?.toLowerCase() || '';
    const title = document.title.toLowerCase();
    
    // Enhanced job-related keywords in URL, title, or content
    const jobKeywords = [
      'careers', 'jobs', 'apply', 'application', 'position', 'employment',
      'lever.co', 'greenhouse.io', 'workday.com', 'jobvite.com', 'breezy.hr',
      'hire', 'hiring', 'join', 'team', 'vacancy', 'openings', 'opportunities',
      'candidate', 'recruit', 'talent', 'role', 'opening'
    ];
    
    const formKeywords = [
      'resume', 'cv', 'first name', 'last name', 'email', 'phone',
      'cover letter', 'experience', 'skills', 'education', 'name', 'contact',
      'upload', 'attach', 'portfolio', 'linkedin', 'github', 'website'
    ];
    
    // Check for form inputs that suggest job application
    const hasJobFormInputs = document.querySelectorAll(`
      input[name*="name"], input[name*="email"], input[name*="phone"],
      input[name*="resume"], input[name*="cv"], input[name*="cover"],
      input[type="file"], textarea[name*="experience"], 
      textarea[name*="why"], textarea[name*="motivation"],
      input[name*="first"], input[name*="last"], input[name*="contact"]
    `).length > 0;
    
    // Check if there are file upload fields (common in job applications)
    const hasFileUpload = document.querySelectorAll('input[type="file"]').length > 0;
    
    // Check for forms with multiple text inputs (application forms typically have many fields)
    const forms = document.querySelectorAll('form');
    const hasLongForm = Array.from(forms).some(form => 
      form.querySelectorAll('input[type="text"], input[type="email"], textarea').length >= 3
    );
    
    const isJobPage = jobKeywords.some(keyword => 
      url.includes(keyword) || content.includes(keyword) || title.includes(keyword)
    ) || formKeywords.some(keyword => content.includes(keyword)) ||
    hasJobFormInputs || hasFileUpload || hasLongForm;
    
    // Debug logging to help understand why pages aren't detected
    if (!isJobPage) {
      console.log('JobFlow Debug: Page not detected as job application page');
      console.log('URL:', url);
      console.log('Title:', title);
      console.log('Has job form inputs:', hasJobFormInputs);
      console.log('Has file upload:', hasFileUpload);
      console.log('Has long form:', hasLongForm);
    } else {
      console.log('JobFlow: Detected job application page');
    }
    
    return isJobPage;
  }

  async loadResumeData() {
    try {
      // Use Chrome messaging to get resume data from background script (avoids CORS)
      const response = await chrome.runtime.sendMessage({ action: 'getResumeData' });
      
      if (response.success && response.data) {
        if (response.data.error) {
          console.warn('JobFlow: No resume data available');
          return;
        }
        this.resumeData = response.data;
      } else {
        console.warn('JobFlow: No resume data available');
      }
    } catch (error) {
      console.error('JobFlow: Failed to load resume data', error);
    }
  }

  detectForms() {
    const forms = document.querySelectorAll('form');
    if (forms.length > 0 && this.resumeData) {
      console.log(`JobFlow: Detected ${forms.length} forms on this page`);
      this.showNotification(`Found ${forms.length} form(s) ready to auto-fill`);
      this.createFloatingButton();
      return true;
    }
    return false;
  }

  setupDynamicFormDetection() {
    // Watch for dynamically added forms (common in React/Vue applications)
    this.observer = new MutationObserver((mutations) => {
      let formsAdded = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              // Check if the added node contains forms or is a form
              if (element.tagName === 'FORM' || element.querySelector('form')) {
                formsAdded = true;
              }
              // Check for common input fields that indicate a form
              if (element.querySelector('input[type="email"], input[name*="name"], input[name*="phone"]')) {
                formsAdded = true;
              }
            }
          });
        }
      });
      
      if (formsAdded) {
        console.log('JobFlow: Dynamic form detected, retrying form detection');
        setTimeout(() => this.detectForms(), 500); // Small delay to ensure form is fully rendered
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  detectFormsWithRetry() {
    // Try to detect forms immediately
    if (this.detectForms()) {
      return;
    }

    // If no forms found, retry periodically for dynamic content
    const retryInterval = setInterval(() => {
      this.retryCount++;
      console.log(`JobFlow: Retry ${this.retryCount}/${this.maxRetries} - Looking for forms...`);
      
      if (this.detectForms() || this.retryCount >= this.maxRetries) {
        clearInterval(retryInterval);
        if (this.retryCount >= this.maxRetries && !this.ui) {
          console.log('JobFlow: No forms found after maximum retries');
        }
      }
    }, 1000); // Retry every 1 second
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
    
    // Enhanced parsing of resume data from text format
    const parsedData = this.parseResumeText(this.resumeData);
    
    const fieldMappings = [
      // Name fields (Enhanced for Greenhouse/dynamic forms)
      { 
        selectors: [
          'input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="first" i]',
          'input[data-test*="first" i]', 'input[aria-label*="first" i]',
          '.first-name input', '#first-name', '[name="job_application[first_name]"]'
        ], 
        value: parsedData.firstName,
        type: 'firstName'
      },
      { 
        selectors: [
          'input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last" i]',
          'input[data-test*="last" i]', 'input[aria-label*="last" i]',
          '.last-name input', '#last-name', '[name="job_application[last_name]"]'
        ], 
        value: parsedData.lastName,
        type: 'lastName'
      },
      { 
        selectors: ['input[name*="name" i]:not([name*="first" i]):not([name*="last" i])', 'input[id*="name" i]', 'input[placeholder*="full name" i]'], 
        value: parsedData.fullName,
        type: 'fullName',
        priority: 'low'
      },
      
      // Contact fields (Enhanced for Greenhouse/dynamic forms)
      { 
        selectors: [
          'input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]',
          'input[data-test*="email" i]', 'input[aria-label*="email" i]',
          '.email input', '#email', '[name="job_application[email]"]'
        ], 
        value: parsedData.email,
        type: 'email'
      },
      { 
        selectors: [
          'input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]',
          'input[data-test*="phone" i]', 'input[aria-label*="phone" i]',
          '.phone input', '#phone', '[name="job_application[phone]"]'
        ], 
        value: parsedData.phone,
        type: 'phone'
      },
      
      // Address fields
      { 
        selectors: ['input[name*="address" i]', 'input[id*="address" i]', 'input[placeholder*="address" i]'], 
        value: parsedData.address,
        type: 'address'
      },
      { 
        selectors: ['input[name*="city" i]', 'input[id*="city" i]', 'input[placeholder*="city" i]'], 
        value: parsedData.city,
        type: 'city'
      },
      { 
        selectors: ['input[name*="zip" i]', 'input[name*="postal" i]', 'input[id*="zip" i]'], 
        value: parsedData.zipCode,
        type: 'zipCode'
      },
      
      // Experience fields
      { 
        selectors: ['input[name*="years" i]', 'input[id*="years" i]', 'select[name*="years" i]'], 
        value: parsedData.yearsOfExperience,
        type: 'yearsOfExperience'
      },
      { 
        selectors: ['textarea[name*="experience" i]', 'textarea[id*="experience" i]', 'textarea[placeholder*="experience" i]'], 
        value: parsedData.workExperience,
        type: 'workExperience'
      },
      { 
        selectors: ['input[name*="position" i]', 'input[name*="title" i]', 'input[id*="position" i]'], 
        value: parsedData.currentTitle,
        type: 'currentTitle'
      },
      { 
        selectors: ['input[name*="company" i]', 'input[id*="company" i]', 'input[placeholder*="company" i]'], 
        value: parsedData.currentCompany,
        type: 'currentCompany'
      },
      
      // Skills
      { 
        selectors: ['textarea[name*="skill" i]', 'textarea[id*="skill" i]', 'textarea[placeholder*="skill" i]'], 
        value: parsedData.skills,
        type: 'skills'
      },
      
      // Education fields
      { 
        selectors: ['input[name*="school" i]', 'input[name*="university" i]', 'input[id*="school" i]'], 
        value: parsedData.school,
        type: 'school'
      },
      { 
        selectors: ['input[name*="degree" i]', 'input[id*="degree" i]', 'select[name*="degree" i]'], 
        value: parsedData.degree,
        type: 'degree'
      },
      { 
        selectors: ['input[name*="major" i]', 'input[name*="field" i]', 'input[id*="major" i]'], 
        value: parsedData.fieldOfStudy,
        type: 'fieldOfStudy'
      },
      { 
        selectors: ['input[name*="gpa" i]', 'input[id*="gpa" i]'], 
        value: parsedData.gpa,
        type: 'gpa'
      },
      { 
        selectors: ['textarea[name*="education" i]', 'textarea[id*="education" i]', 'textarea[placeholder*="education" i]'], 
        value: parsedData.education,
        type: 'education'
      },
      
      // Cover letter / motivation
      { 
        selectors: ['textarea[name*="cover" i]', 'textarea[name*="letter" i]', 'textarea[name*="motivation" i]', 'textarea[name*="why" i]'], 
        value: parsedData.coverLetter,
        type: 'coverLetter'
      },
      
      // Links
      { 
        selectors: ['input[name*="linkedin" i]', 'input[id*="linkedin" i]', 'input[placeholder*="linkedin" i]'], 
        value: parsedData.linkedinUrl,
        type: 'linkedinUrl'
      },
      { 
        selectors: ['input[name*="github" i]', 'input[id*="github" i]', 'input[placeholder*="github" i]'], 
        value: parsedData.githubUrl,
        type: 'githubUrl'
      },
      { 
        selectors: ['input[name*="website" i]', 'input[name*="portfolio" i]', 'input[id*="website" i]'], 
        value: parsedData.websiteUrl,
        type: 'websiteUrl'
      }
    ];

    fieldMappings.forEach(mapping => {
      if (!mapping.value) return;

      mapping.selectors.forEach(selector => {
        const fields = form.querySelectorAll(selector);
        fields.forEach(field => {
          // Skip if already filled (unless low priority)
          if (field.value.trim() && mapping.priority !== 'low') return;
          
          // Handle different field types
          if (field.tagName.toLowerCase() === 'select') {
            this.fillSelectElement(field, mapping.value);
          } else {
            field.value = mapping.value;
          }
          
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

  fillSelectElement(selectElement, value) {
    const options = Array.from(selectElement.options);
    
    // Try exact match first
    let matchingOption = options.find(option => 
      option.value.toLowerCase() === value.toLowerCase() || 
      option.textContent.toLowerCase() === value.toLowerCase()
    );
    
    // Try partial match
    if (!matchingOption && value) {
      matchingOption = options.find(option => 
        option.value.toLowerCase().includes(value.toLowerCase()) || 
        option.textContent.toLowerCase().includes(value.toLowerCase())
      );
    }
    
    if (matchingOption) {
      selectElement.value = matchingOption.value;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  parseResumeText(resumeData) {
    // If resumeData is already parsed, use it
    if (resumeData.fullName && resumeData.email) {
      return {
        fullName: resumeData.fullName,
        firstName: resumeData.firstName || resumeData.fullName?.split(' ')[0] || '',
        lastName: resumeData.lastName || resumeData.fullName?.split(' ').slice(-1)[0] || '',
        email: resumeData.email,
        phone: resumeData.phone,
        address: resumeData.address || '',
        city: resumeData.city || '',
        zipCode: resumeData.zipCode || '',
        yearsOfExperience: resumeData.yearsOfExperience || resumeData.experience || '',
        workExperience: resumeData.workExperience || resumeData.experience || '',
        currentTitle: resumeData.currentTitle || '',
        currentCompany: resumeData.currentCompany || '',
        skills: Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills || '',
        school: resumeData.school || resumeData.education || '',
        degree: resumeData.degree || '',
        fieldOfStudy: resumeData.fieldOfStudy || resumeData.major || '',
        gpa: resumeData.gpa || '',
        education: resumeData.education || '',
        coverLetter: this.generateCoverLetter(resumeData),
        linkedinUrl: resumeData.linkedinUrl || '',
        githubUrl: resumeData.githubUrl || '',
        websiteUrl: resumeData.websiteUrl || ''
      };
    }

    // Parse from raw text if needed
    const text = resumeData.extractedText || '';
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const parsed = {
      fullName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      zipCode: '',
      yearsOfExperience: '',
      workExperience: '',
      currentTitle: '',
      currentCompany: '',
      skills: '',
      school: '',
      degree: '',
      fieldOfStudy: '',
      gpa: '',
      education: '',
      coverLetter: '',
      linkedinUrl: '',
      githubUrl: '',
      websiteUrl: ''
    };

    // Extract basic info from text
    lines.forEach((line, index) => {
      // Name (usually first line)
      if (index === 0 && /^[A-Za-z\s]+$/.test(line) && line.split(' ').length >= 2) {
        parsed.fullName = line;
        const nameParts = line.split(' ');
        parsed.firstName = nameParts[0];
        parsed.lastName = nameParts[nameParts.length - 1];
      }
      
      // Email
      const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) parsed.email = emailMatch[0];
      
      // Phone
      const phoneMatch = line.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
      if (phoneMatch) parsed.phone = phoneMatch[0];
      
      // Years of experience
      const yearsMatch = line.match(/(\d+)[\+\s]*years?\s+(?:of\s+)?(?:experience|exp)/i);
      if (yearsMatch) parsed.yearsOfExperience = yearsMatch[1];
      
      // Current position/company
      if (line.toLowerCase().includes('software engineer') || line.toLowerCase().includes('developer')) {
        parsed.currentTitle = line;
      }
      
      // Education
      if (line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || 
          line.toLowerCase().includes('bachelor') || line.toLowerCase().includes('master')) {
        parsed.school = line;
        parsed.education = line;
      }
      
      // Skills (if line contains common tech terms)
      const skillKeywords = ['javascript', 'python', 'react', 'node', 'java', 'sql', 'aws', 'docker'];
      if (skillKeywords.some(skill => line.toLowerCase().includes(skill))) {
        parsed.skills = line;
      }
    });

    parsed.coverLetter = this.generateCoverLetter(parsed);
    
    return parsed;
  }

  generateCoverLetter(data) {
    return `Dear Hiring Manager,

I am writing to express my interest in this position. With ${data.yearsOfExperience || 'several'} years of experience in ${data.skills || 'the technology industry'}, I am confident that I would be a valuable addition to your team.

In my current role${data.currentTitle ? ` as ${data.currentTitle}` : ''}${data.currentCompany ? ` at ${data.currentCompany}` : ''}, I have developed strong skills in ${data.skills || 'software development'}.

I am excited about the opportunity to contribute to your organization and would welcome the chance to discuss how my experience aligns with your needs.

Best regards,
${data.fullName || 'Applicant'}`;
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

  cleanup() {
    // Stop observing mutations
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'triggerAutoFill') {
    // Trigger auto-fill from context menu
    const autoFill = new JobFlowAutoFill();
    autoFill.init();
  }
});

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