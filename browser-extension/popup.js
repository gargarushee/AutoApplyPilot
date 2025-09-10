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
        function: executeAutoFillScript,
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

// Standalone functions for script injection (must be outside the class)

// Auto-fill function that runs in page context
function executeAutoFillScript(resumeData) {
  // This function runs in the context of the web page
  let totalFilled = 0;
  const forms = document.querySelectorAll('form');

  // Parse resume data for form filling (inline parsing)
  const parsedData = {
    fullName: resumeData.fullName || '',
    firstName: resumeData.firstName || (resumeData.fullName ? resumeData.fullName.split(' ')[0] : ''),
    lastName: resumeData.lastName || (resumeData.fullName ? resumeData.fullName.split(' ').slice(1).join(' ') : ''),
    email: resumeData.email || '',
    phone: resumeData.phone || '',
    address: resumeData.address || '',
    city: resumeData.city || '',
    zipCode: resumeData.zipCode || '',
    yearsOfExperience: resumeData.yearsOfExperience || '',
    workExperience: resumeData.experience || '',
    currentTitle: resumeData.currentTitle || '',
    currentCompany: resumeData.currentCompany || '',
    skills: Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : (resumeData.skills || ''),
    school: resumeData.school || '',
    degree: resumeData.degree || '',
    fieldOfStudy: resumeData.fieldOfStudy || '',
    gpa: resumeData.gpa || '',
    education: resumeData.education || '',
    coverLetter: resumeData.coverLetter || `Dear Hiring Manager,

I am writing to express my interest in this position. With several years of experience in the technology industry, I am confident that I would be a valuable addition to your team.

In my current role, I have developed strong skills in software development and problem-solving.

I am excited about the opportunity to contribute to your organization and would welcome the chance to discuss how my experience aligns with your needs.

Best regards,
${resumeData.fullName || 'Applicant'}`,
    linkedinUrl: resumeData.linkedinUrl || '',
    githubUrl: resumeData.githubUrl || '',
    websiteUrl: resumeData.websiteUrl || ''
  };

  console.log('JobFlow: Auto-fill script executing with data:', parsedData);
  console.log(`JobFlow: Found ${forms.length} total forms on page`);

  // Log all forms with their characteristics to debug which one to target
  forms.forEach((form, index) => {
    const inputs = form.querySelectorAll('input, textarea, select');
    const formText = form.innerHTML.toLowerCase();
    const hasContactFields = form.querySelector('input[name*="your-"]');
    const hasJobAppFields = formText.includes('first name') && formText.includes('last name');
    
    console.log(`Form ${index + 1}:`, {
      inputCount: inputs.length,
      hasContactFields: !!hasContactFields,
      hasJobAppFields,
      sampleInputs: Array.from(inputs).slice(0, 3).map(inp => ({
        tag: inp.tagName,
        name: inp.name,
        placeholder: inp.placeholder,
        type: inp.type
      }))
    });
  });

  // Filter to only process the job application form (exclude contact forms)
  const jobApplicationForms = Array.from(forms).filter(form => {
    const hasContactFields = form.querySelector('input[name*="your-"]');
    const formText = form.innerHTML.toLowerCase();
    const hasJobAppStructure = formText.includes('first name') && formText.includes('last name') && formText.includes('resume');
    
    console.log('Form filtering:', { hasContactFields: !!hasContactFields, hasJobAppStructure });
    return !hasContactFields && hasJobAppStructure;
  });

  console.log(`JobFlow: Filtered to ${jobApplicationForms.length} job application forms`);

  jobApplicationForms.forEach((form, formIndex) => {
    console.log(`JobFlow: Processing job application form ${formIndex + 1}/${jobApplicationForms.length}`);
    
    // Log all inputs in this specific form for detailed debugging
    const allInputs = form.querySelectorAll('input, textarea, select');
    console.log(`JobFlow: Form has ${allInputs.length} inputs:`);
    allInputs.forEach((input, i) => {
      console.log(`  Input ${i + 1}: ${input.tagName} name="${input.name}" placeholder="${input.placeholder}" type="${input.type}" id="${input.id}"`);
    });

    // More precise field targeting based on labels and context
    const fieldMappings = [
      { 
        selectors: [
          // Look for first input in a div that contains "First Name" text
          'div:contains("First Name") input[type="text"]',
          'label:contains("First Name") + input',
          'label:contains("first name") + input',
          'input[aria-label*="First Name" i]',
          'input[name*="first_name"]',
          'input[id*="first_name"]'
        ], 
        value: parsedData.firstName,
        type: 'firstName'
      },
      { 
        selectors: [
          'div:contains("Last Name") input[type="text"]',
          'label:contains("Last Name") + input',
          'label:contains("last name") + input', 
          'input[aria-label*="Last Name" i]',
          'input[name*="last_name"]',
          'input[id*="last_name"]'
        ], 
        value: parsedData.lastName,
        type: 'lastName'
      },
      { 
        selectors: [
          'div:contains("Email") input[type="email"]',
          'div:contains("Email") input[type="text"]',
          'label:contains("Email") + input',
          'input[type="email"]:not([name*="your-"])',
          'input[name*="email"]:not([name*="your-"])'
        ], 
        value: parsedData.email,
        type: 'email'
      },
      { 
        selectors: [
          'div:contains("Phone") input[type="text"]',
          'div:contains("Phone") input[type="tel"]',
          'label:contains("Phone") + input',
          'input[type="tel"]',
          'input[name*="phone"]'
        ], 
        value: parsedData.phone,
        type: 'phone'
      },
      { 
        selectors: [
          'div:contains("LinkedIn") input',
          'div:contains("LinkedIn") textarea',
          'label:contains("LinkedIn") + input',
          'input[name*="linkedin"]'
        ], 
        value: parsedData.linkedinUrl,
        type: 'linkedin'
      }
    ];

    fieldMappings.forEach(mapping => {
      if (!mapping.value) {
        console.log(`JobFlow: Skipping ${mapping.type} - no value available`);
        return;
      }

      console.log(`JobFlow: Looking for ${mapping.type} fields with value: "${mapping.value}"`);
      let foundFields = 0;

      mapping.selectors.forEach(selector => {
        try {
          // Custom selector handling for :contains() which isn't natively supported
          let fields = [];
          if (selector.includes(':contains(')) {
            // Handle :contains() selector manually
            const match = selector.match(/(.+):contains\("([^"]+)"\)\s*(.+)/);
            if (match) {
              const [, containerSelector, containsText, inputSelector] = match;
              const containers = form.querySelectorAll(containerSelector);
              containers.forEach(container => {
                if (container.textContent.toLowerCase().includes(containsText.toLowerCase())) {
                  const inputs = container.querySelectorAll(inputSelector);
                  fields.push(...inputs);
                }
              });
            }
          } else {
            fields = Array.from(form.querySelectorAll(selector));
          }
          
          console.log(`  Selector "${selector}": found ${fields.length} fields`);
          
          // Only fill the FIRST matching field to avoid filling multiple fields
          if (fields.length > 0 && foundFields === 0) {
            const field = fields[0];
            console.log(`    Found field: ${field.tagName} placeholder="${field.placeholder}" name="${field.name}"`);
            
            if (field.value && field.value.trim()) {
              console.log(`    Skipping - field already has value: "${field.value}"`);
              return;
            }
            
            if (field.tagName.toLowerCase() === 'select') {
              // Handle select dropdowns
              const options = field.querySelectorAll('option');
              for (let option of options) {
                if (option.textContent.toLowerCase().includes(mapping.value.toLowerCase())) {
                  field.value = option.value;
                  field.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            } else {
              console.log(`    Filling ${field.tagName} field with: "${mapping.value}"`);
              field.value = mapping.value;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            
            foundFields++;
            totalFilled++;
            console.log(`    ✓ Successfully filled field`);
          }
        } catch (error) {
          console.log(`    Error with selector "${selector}": ${error.message}`);
        }
      });

      if (foundFields === 0) {
        console.log(`JobFlow: No fields found for ${mapping.type} using any selector`);
      }
    });
  });

  // Handle resume file attachment after filling fields
  console.log('JobFlow: Looking for file upload fields...');
  
  // Look for file input elements (resume upload)
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log(`JobFlow: Found ${fileInputs.length} file input fields`);
  
  if (fileInputs.length > 0 && resumeData.filename) {
    fileInputs.forEach((fileInput, index) => {
      console.log(`JobFlow: Processing file input ${index + 1}:`);
      console.log(`  Input: accept="${fileInput.accept}" name="${fileInput.name}"`);
      
      // Check if this is likely a resume upload field
      const parentText = fileInput.parentElement?.textContent?.toLowerCase() || '';
      const isResumeField = parentText.includes('resume') || 
                           parentText.includes('cv') || 
                           fileInput.accept?.includes('.pdf') ||
                           fileInput.accept?.includes('application/pdf');
      
      if (isResumeField) {
        console.log('  This appears to be a resume upload field');
        
        try {
          // Create a File object from the resume data
          const resumeContent = resumeData.extractedText || 'Resume content';
          const file = new File([resumeContent], resumeData.filename || 'resume.txt', {
            type: 'text/plain',
            lastModified: Date.now()
          });
          
          // Create a FileList-like object
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          
          // Trigger events to notify the form
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log(`  ✓ Attached resume file: ${resumeData.filename}`);
          totalFilled++;
        } catch (error) {
          console.log(`  ✗ Failed to attach resume: ${error.message}`);
        }
      } else {
        console.log('  Skipping - not a resume upload field');
      }
    });
  } else {
    console.log('JobFlow: No file inputs found or no resume data available');
  }

  console.log(`JobFlow: Total fields filled: ${totalFilled}`);
  return totalFilled;
}

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