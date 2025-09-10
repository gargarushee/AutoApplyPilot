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
        function: checkForJobFormsScript
      });

      const pageInfo = results && results[0] && results[0].result 
        ? results[0].result 
        : { isJobPage: false, formsFound: 0 };
      this.updatePageStatus(pageInfo);
    } catch (error) {
      console.error('Failed to check page status:', error);
      this.updatePageStatus({ isJobPage: false, formsFound: 0 });
    }
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

    // Ensure pageInfo is valid and has required properties
    if (!pageInfo || typeof pageInfo !== 'object') {
      pageInfo = { isJobPage: false, formsFound: 0 };
    }

    const isJobPage = pageInfo.isJobPage === true;
    const formsFound = pageInfo.formsFound || 0;

    if (isJobPage && formsFound > 0) {
      statusIndicator.className = 'status-indicator ready';
      statusText.textContent = 'Job application page detected';
      autoFillBtn.disabled = false;
      
      // Show stats
      document.getElementById('forms-found').textContent = formsFound;
      statsElement.style.display = 'flex';
    } else if (isJobPage) {
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
      chrome.tabs.create({ url: 'https://66b0dabc-42e9-4daf-ac7b-fcbb39401103-00-297d8ia1kql4j.worf.replit.dev/' });
    });

    document.getElementById('dashboard-link').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://66b0dabc-42e9-4daf-ac7b-fcbb39401103-00-297d8ia1kql4j.worf.replit.dev/' });
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

    // Enhanced parsing of resume data from text format
    const parsedData = this.parseResumeText(resumeData);

    forms.forEach(form => {
      const fieldMappings = [
        // Name fields
        { 
          selectors: ['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="first" i]'], 
          value: parsedData.firstName
        },
        { 
          selectors: ['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="last" i]'], 
          value: parsedData.lastName
        },
        { 
          selectors: ['input[name*="name" i]:not([name*="first" i]):not([name*="last" i])', 'input[id*="name" i]', 'input[placeholder*="full name" i]'], 
          value: parsedData.fullName
        },
        
        // Contact fields
        { 
          selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]'], 
          value: parsedData.email
        },
        { 
          selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]'], 
          value: parsedData.phone
        },
        
        // Address fields
        { 
          selectors: ['input[name*="address" i]', 'input[id*="address" i]', 'input[placeholder*="address" i]'], 
          value: parsedData.address
        },
        { 
          selectors: ['input[name*="city" i]', 'input[id*="city" i]', 'input[placeholder*="city" i]'], 
          value: parsedData.city
        },
        { 
          selectors: ['input[name*="zip" i]', 'input[name*="postal" i]', 'input[id*="zip" i]'], 
          value: parsedData.zipCode
        },
        
        // Experience fields
        { 
          selectors: ['input[name*="years" i]', 'input[id*="years" i]', 'select[name*="years" i]'], 
          value: parsedData.yearsOfExperience
        },
        { 
          selectors: ['textarea[name*="experience" i]', 'textarea[id*="experience" i]', 'textarea[placeholder*="experience" i]'], 
          value: parsedData.workExperience
        },
        { 
          selectors: ['input[name*="position" i]', 'input[name*="title" i]', 'input[id*="position" i]'], 
          value: parsedData.currentTitle
        },
        { 
          selectors: ['input[name*="company" i]', 'input[id*="company" i]', 'input[placeholder*="company" i]'], 
          value: parsedData.currentCompany
        },
        
        // Skills fields
        { 
          selectors: ['textarea[name*="skill" i]', 'textarea[id*="skill" i]', 'textarea[placeholder*="skill" i]'], 
          value: parsedData.skills
        },
        
        // Education fields
        { 
          selectors: ['input[name*="school" i]', 'input[name*="university" i]', 'input[id*="school" i]'], 
          value: parsedData.school
        },
        { 
          selectors: ['input[name*="degree" i]', 'input[id*="degree" i]', 'select[name*="degree" i]'], 
          value: parsedData.degree
        },
        { 
          selectors: ['input[name*="major" i]', 'input[name*="field" i]', 'input[id*="major" i]'], 
          value: parsedData.fieldOfStudy
        },
        { 
          selectors: ['input[name*="gpa" i]', 'input[id*="gpa" i]'], 
          value: parsedData.gpa
        },
        
        // Cover letter / motivation
        { 
          selectors: ['textarea[name*="cover" i]', 'textarea[name*="letter" i]', 'textarea[name*="motivation" i]', 'textarea[name*="why" i]'], 
          value: parsedData.coverLetter
        },
        
        // Links
        { 
          selectors: ['input[name*="linkedin" i]', 'input[id*="linkedin" i]', 'input[placeholder*="linkedin" i]'], 
          value: parsedData.linkedinUrl
        },
        { 
          selectors: ['input[name*="github" i]', 'input[id*="github" i]', 'input[placeholder*="github" i]'], 
          value: parsedData.githubUrl
        },
        { 
          selectors: ['input[name*="website" i]', 'input[name*="portfolio" i]', 'input[id*="website" i]'], 
          value: parsedData.websiteUrl
        }
      ];

      fieldMappings.forEach(mapping => {
        if (!mapping.value) return;

        mapping.selectors.forEach(selector => {
          const fields = form.querySelectorAll(selector);
          fields.forEach(field => {
            if (field.value.trim()) return; // Skip filled fields
            
            if (field.tagName.toLowerCase() === 'select') {
              // Handle select dropdowns
              this.fillSelectElement(field, mapping.value);
            } else {
              field.value = mapping.value;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            totalFilled++;
          });
        });
      });
    });

    return totalFilled;
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

// Standalone function for script injection (must be outside the class)
function checkForJobFormsScript() {
  // This function runs in the context of the web page
  const url = window.location.href.toLowerCase();
  const content = document.body?.textContent?.toLowerCase() || '';
  
  const jobKeywords = [
    'careers', 'jobs', 'apply', 'application', 'position', 'employment', 'hiring',
    'lever.co', 'greenhouse.io', 'workday.com', 'jobvite.com', 'breezy.hr',
    'gh_jid', 'job', 'opening', 'staff', 'engineer', 'developer'
  ];
  
  const formKeywords = [
    'resume', 'cv', 'first name', 'last name', 'email', 'phone',
    'cover letter', 'experience', 'skills', 'education', 'apply for this job',
    'submit application', 'greenhouse', 'autofill with greenhouse'
  ];
  
  // Enhanced detection - check URL keywords
  const urlHasJobKeywords = jobKeywords.some(keyword => url.includes(keyword));
  
  // Check content keywords  
  const contentHasJobKeywords = formKeywords.some(keyword => content.includes(keyword));
  
  // Check for specific job application indicators
  const hasJobApplicationForm = document.querySelector('form') && (
    content.includes('apply for this job') ||
    content.includes('submit application') ||
    content.includes('first name') ||
    content.includes('resume/cv') ||
    url.includes('gh_jid') ||
    url.includes('careers')
  );
  
  const isJobPage = urlHasJobKeywords || contentHasJobKeywords || hasJobApplicationForm;
  
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');
  
  // Debug logging (will show in browser console)
  console.log('JobFlow Page Detection Debug:', {
    url: window.location.href,
    urlHasJobKeywords,
    contentHasJobKeywords, 
    hasJobApplicationForm,
    isJobPage,
    formsFound: forms.length,
    inputsFound: inputs.length
  });
  
  return {
    isJobPage,
    formsFound: forms.length,
    inputsFound: inputs.length,
    url: window.location.href
  };
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new JobFlowPopup();
  popup.init();
});