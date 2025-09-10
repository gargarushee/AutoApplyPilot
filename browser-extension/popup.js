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
      
      // Current position/company extraction
      if (line.toLowerCase().includes('software engineer') || line.toLowerCase().includes('developer')) {
        parsed.currentTitle = line;
        
        // Extract company name if it follows "at" pattern
        const atMatch = line.match(/(.+?)\s+at\s+(.+)/i);
        if (atMatch) {
          parsed.currentTitle = atMatch[1].trim();
          parsed.currentCompany = atMatch[2].trim();
        }
      }
      
      // Look for company patterns
      const companyMatch = line.match(/(?:at|@|with|for)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company)?)/);
      if (companyMatch && !parsed.currentCompany) {
        parsed.currentCompany = companyMatch[1].trim();
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

    // Robust field targeting using multiple selector strategies
    const fieldMappings = [
      { 
        selectors: [
          // First Name - target by position and attributes
          'input[aria-label*="First Name" i]',
          'input[placeholder*="First" i]',
          'input[name*="first" i]',
          'input[id*="first" i]',
          'form input[type="text"]:first-of-type' // Often first text input
        ], 
        value: parsedData.firstName,
        type: 'firstName'
      },
      { 
        selectors: [
          // Last Name - target by position and attributes  
          'input[aria-label*="Last Name" i]',
          'input[placeholder*="Last" i]',
          'input[name*="last" i]',
          'input[id*="last" i]',
          'form input[type="text"]:nth-of-type(2)' // Often second text input
        ], 
        value: parsedData.lastName,
        type: 'lastName'
      },
      { 
        selectors: [
          // Email - target email inputs and common patterns
          'input[type="email"]:not([name*="your-"])',
          'input[aria-label*="Email" i]',
          'input[placeholder*="Email" i]',
          'input[name*="email"]:not([name*="your-"])',
          'input[id*="email"]:not([name*="your-"])',
          'form input[type="text"][placeholder*="@" i]'
        ], 
        value: parsedData.email,
        type: 'email'
      },
      { 
        selectors: [
          // Phone - target phone inputs and patterns
          'input[type="tel"]',
          'input[aria-label*="Phone" i]',
          'input[placeholder*="Phone" i]',
          'input[name*="phone" i]',
          'input[id*="phone" i]',
          'input[placeholder*="number" i]'
        ], 
        value: parsedData.phone,
        type: 'phone'
      },
      { 
        selectors: [
          // Location/City
          'input[aria-label*="Location" i]',
          'input[aria-label*="City" i]',
          'input[placeholder*="Location" i]',
          'input[placeholder*="City" i]',
          'input[name*="location" i]',
          'input[name*="city" i]',
          'input[id*="location" i]',
          'input[id*="city" i]'
        ], 
        value: parsedData.city || 'San Francisco, CA',
        type: 'location'
      },
      { 
        selectors: [
          // Current Title/Position
          'input[aria-label*="Current Title" i]',
          'input[aria-label*="Current Position" i]',
          'input[aria-label*="Job Title" i]',
          'input[placeholder*="Current Title" i]',
          'input[placeholder*="Current Position" i]',
          'input[placeholder*="Job Title" i]',
          'input[placeholder*="Title" i]',
          'input[name*="title" i]',
          'input[name*="position" i]',
          'input[id*="title" i]',
          'input[id*="position" i]'
        ], 
        value: parsedData.currentTitle,
        type: 'currentTitle'
      },
      { 
        selectors: [
          // Current Company/Employer
          'input[aria-label*="Current Company" i]',
          'input[aria-label*="Current Employer" i]',
          'input[aria-label*="Company" i]',
          'input[placeholder*="Current Company" i]',
          'input[placeholder*="Current Employer" i]',
          'input[placeholder*="Company" i]',
          'input[placeholder*="Employer" i]',
          'input[name*="company" i]',
          'input[name*="employer" i]',
          'input[id*="company" i]',
          'input[id*="employer" i]'
        ], 
        value: parsedData.currentCompany,
        type: 'currentCompany'
      },
      { 
        selectors: [
          // LinkedIn Profile
          'input[aria-label*="LinkedIn" i]',
          'input[placeholder*="LinkedIn" i]',
          'input[name*="linkedin" i]',
          'input[id*="linkedin" i]',
          'textarea[placeholder*="LinkedIn" i]',
          'input[placeholder*="profile" i]'
        ], 
        value: parsedData.linkedinUrl,
        type: 'linkedin'
      },
      { 
        selectors: [
          // GitHub Profile
          'input[aria-label*="GitHub" i]',
          'input[aria-label*="Github" i]',
          'input[placeholder*="GitHub" i]',
          'input[placeholder*="Github" i]',
          'input[name*="github" i]',
          'input[id*="github" i]',
          'input[placeholder*="git" i]'
        ], 
        value: parsedData.githubUrl,
        type: 'github'
      },
      { 
        selectors: [
          // Cover Letter
          'textarea[aria-label*="Cover" i]',
          'textarea[placeholder*="Cover" i]',
          'textarea[name*="cover" i]',
          'textarea[id*="cover" i]',
          'textarea[placeholder*="letter" i]',
          'textarea[name*="letter" i]'
        ], 
        value: parsedData.coverLetter,
        type: 'coverLetter'
      }
    ];

    // Generate intelligent responses for open-ended questions
    const generatedResponses = generateIntelligentResponses(resumeData);
    console.log('JobFlow: Generated intelligent responses:', generatedResponses);

    // Additional field mappings for generative/open-ended questions
    const generativeFieldMappings = [
      {
        patterns: ['exceptional work', 'exceptional', 'outstanding', 'remarkable work', 'proud of'],
        selectors: ['textarea'],
        value: generatedResponses.exceptionalWork,
        type: 'exceptionalWork'
      },
      {
        patterns: ['biggest achievement', 'greatest achievement', 'accomplishment', 'proud achievement'],
        selectors: ['textarea'],
        value: generatedResponses.biggestAchievement,
        type: 'biggestAchievement'
      },
      {
        patterns: ['why hire you', 'why should we hire', 'what makes you', 'unique value'],
        selectors: ['textarea'],
        value: generatedResponses.whyHireYou,
        type: 'whyHireYou'
      },
      {
        patterns: ['technical challenge', 'difficult problem', 'complex problem', 'challenging project'],
        selectors: ['textarea'],
        value: generatedResponses.technicalChallenge,
        type: 'technicalChallenge'
      },
      {
        patterns: ['leadership experience', 'leadership', 'led a team', 'managed'],
        selectors: ['textarea'],
        value: generatedResponses.leadershipExperience,
        type: 'leadershipExperience'
      },
      {
        patterns: ['passion', 'passionate about', 'motivates you', 'drives you'],
        selectors: ['textarea'],
        value: generatedResponses.passion,
        type: 'passion'
      }
    ];

    // Analyze resume data to determine intelligent answers
    const resumeAnalysis = analyzeResumeForSelections(resumeData);
    console.log('JobFlow: Resume analysis results:', resumeAnalysis);

    // Handle dropdown and radio button selections for common job application questions
    const smartSelections = [
      {
        // Visa sponsorship questions
        patterns: ['sponsorship', 'visa', 'h-1b', 'work authorization', 'legally authorized'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.needsSponsorship ? 'Yes' : 'No',
        fallbackAnswers: resumeAnalysis.needsSponsorship ? ['yes', 'true', '1'] : ['no', 'false', '0'],
        type: 'visaSponsorship'
      },
      {
        // US work eligibility
        patterns: ['eligible.*work.*us', 'authorized.*work.*united states', 'legally.*work.*us'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.canWorkInUS ? 'Yes' : 'No',
        fallbackAnswers: resumeAnalysis.canWorkInUS ? ['yes', 'true', '1'] : ['no', 'false', '0'],
        type: 'workEligibility'
      },
      {
        // Years of experience dropdowns
        patterns: ['years.*experience', 'experience.*years', 'how many years'],
        selectors: ['select'],
        preferredAnswer: resumeAnalysis.experienceRange,
        fallbackAnswers: resumeAnalysis.experienceFallbacks,
        type: 'yearsExperience'
      },
      {
        // Education level
        patterns: ['education', 'degree', 'highest.*education'],
        selectors: ['select'],
        preferredAnswer: resumeAnalysis.educationLevel,
        fallbackAnswers: resumeAnalysis.educationFallbacks,
        type: 'educationLevel'
      },
      {
        // Security clearance
        patterns: ['security clearance', 'clearance'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.hasSecurityClearance ? 'Yes' : 'No',
        fallbackAnswers: resumeAnalysis.hasSecurityClearance ? ['yes', 'active'] : ['no', 'none', 'not applicable'],
        type: 'securityClearance'
      },
      {
        // Remote work preference
        patterns: ['remote', 'work.*home', 'location preference'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.remoteWorkPreference,
        fallbackAnswers: ['remote', 'hybrid', 'on-site', 'any'],
        type: 'remoteWork'
      },
      {
        // Gender selection (voluntary disclosure)
        patterns: ['gender', 'sex', 'male.*female', 'identify.*gender', 'select.*gender'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.gender || '', // Extract from resume or leave empty
        fallbackAnswers: [],
        type: 'gender'
      },
      {
        // Race/ethnicity selection (voluntary disclosure)
        patterns: ['race', 'racial', 'ethnicity', 'ethnic', 'identify.*race', 'please identify', 'racial.*ethnic'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: '', // Leave empty for voluntary disclosure
        fallbackAnswers: [],
        type: 'race'
      },
      {
        // Hispanic/Latino ethnicity (voluntary disclosure)
        patterns: ['hispanic', 'latino', 'latina', 'latinx', 'spanish.*origin', 'are you hispanic'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: '', // Leave empty for voluntary disclosure  
        fallbackAnswers: [],
        type: 'ethnicity'
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
          // Use standard querySelectorAll (no :contains() pseudo-selector)
          const fields = Array.from(form.querySelectorAll(selector));
          console.log(`  Selector "${selector}": found ${fields.length} fields`);
          
          // Only fill the FIRST matching field to avoid filling multiple fields
          if (fields.length > 0 && foundFields === 0) {
            const field = fields[0];
            console.log(`    Found field: ${field.tagName} placeholder="${field.placeholder}" name="${field.name}" id="${field.id}"`);
            
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

    // Handle generative text responses
    console.log('JobFlow: Processing generative text fields...');
    
    generativeFieldMappings.forEach(mapping => {
      if (!mapping.value) {
        console.log(`JobFlow: Skipping ${mapping.type} - no generated response available`);
        return;
      }

      console.log(`JobFlow: Looking for ${mapping.type} fields...`);
      let foundFields = 0;

      // Find textarea elements with surrounding context that matches the patterns
      const allTextareas = form.querySelectorAll('textarea');
      console.log(`  Found ${allTextareas.length} textarea elements`);
      
      allTextareas.forEach((textarea, index) => {
        const surroundingText = getSurroundingText(textarea);
        const isRelevant = mapping.patterns.some(pattern => 
          new RegExp(pattern, 'i').test(surroundingText)
        );
        
        if (isRelevant && foundFields === 0) {
          console.log(`  Textarea ${index + 1} matches ${mapping.type}:`);
          console.log(`    Context: "${surroundingText.substring(0, 100)}..."`);
          
          if (textarea.value && textarea.value.trim()) {
            console.log(`    Skipping - field already has value`);
            return;
          }
          
          console.log(`    Filling with generated response (${mapping.value.length} chars)`);
          textarea.value = mapping.value;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new Event('blur', { bubbles: true }));
          
          foundFields++;
          totalFilled++;
          console.log(`    ✓ Successfully filled generative field`);
        }
      });

      if (foundFields === 0) {
        console.log(`JobFlow: No relevant textarea found for ${mapping.type}`);
      }
    });

    // Handle smart selections for dropdowns and radio buttons
    console.log('JobFlow: Processing smart selections for dropdowns and radio buttons...');
    
    smartSelections.forEach(selection => {
      console.log(`JobFlow: Looking for ${selection.type} fields...`);
      
      // Find relevant elements by checking surrounding text content
      const allElements = form.querySelectorAll(selection.selectors.join(', '));
      console.log(`  Found ${allElements.length} potential ${selection.selectors.join('/')} elements`);
      
      allElements.forEach((element, index) => {
        // Check if this element relates to the question patterns
        const surroundingText = getSurroundingText(element);
        const isRelevant = selection.patterns.some(pattern => 
          new RegExp(pattern, 'i').test(surroundingText)
        );
        
        if (isRelevant) {
          console.log(`  Element ${index + 1} matches ${selection.type}:`);
          console.log(`    Type: ${element.tagName}, Text context: "${surroundingText.substring(0, 100)}..."`);
          
          const success = handleSmartSelection(element, selection);
          if (success) {
            totalFilled++;
            console.log(`    ✓ Successfully selected ${selection.preferredAnswer} for ${selection.type}`);
          } else {
            console.log(`    ✗ Failed to select option for ${selection.type}`);
          }
        }
      });
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

  // Generate intelligent responses for open-ended questions based on resume content
  function generateIntelligentResponses(resumeData) {
    const text = (resumeData.extractedText || '').toLowerCase();
    const experience = (resumeData.experience || '');
    const skills = Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : (resumeData.skills || '');
    
    console.log('JobFlow: Generating intelligent responses from resume content...');
    
    // Extract achievements and projects from resume text
    const achievements = extractAchievements(text);
    const projects = extractProjects(text);
    const technologies = extractTechnologies(text);
    
    // Generate exceptional work response
    const exceptionalWork = generateExceptionalWorkResponse(achievements, projects, technologies, resumeData);
    
    // Generate biggest achievement response
    const biggestAchievement = generateBiggestAchievementResponse(achievements, projects, resumeData);
    
    // Generate why hire you response
    const whyHireYou = generateWhyHireYouResponse(skills, achievements, resumeData);
    
    // Generate technical challenge response
    const technicalChallenge = generateTechnicalChallengeResponse(projects, technologies, resumeData);
    
    // Generate leadership experience response
    const leadershipExperience = generateLeadershipResponse(text, projects, resumeData);
    
    // Generate passion response
    const passion = generatePassionResponse(technologies, skills, resumeData);
    
    return {
      exceptionalWork,
      biggestAchievement,
      whyHireYou,
      technicalChallenge,
      leadershipExperience,
      passion
    };
  }
  
  // Helper functions for content extraction and generation
  function extractAchievements(text) {
    const achievementKeywords = ['achieved', 'accomplished', 'improved', 'increased', 'reduced', 'optimized', 'built', 'created', 'developed', 'launched'];
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(sentence => 
      achievementKeywords.some(keyword => sentence.includes(keyword)) && sentence.length > 20
    ).slice(0, 3);
  }
  
  function extractProjects(text) {
    const projectKeywords = ['project', 'application', 'system', 'platform', 'tool', 'website', 'app'];
    const sentences = text.split(/[.!?]+/);
    return sentences.filter(sentence => 
      projectKeywords.some(keyword => sentence.includes(keyword)) && sentence.length > 15
    ).slice(0, 3);
  }
  
  function extractTechnologies(text) {
    const techKeywords = ['javascript', 'python', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'typescript', 'java', 'c++', 'machine learning', 'ai', 'api'];
    return techKeywords.filter(tech => text.includes(tech));
  }
  
  function generateExceptionalWorkResponse(achievements, projects, technologies, resumeData) {
    if (achievements.length === 0 && projects.length === 0) {
      return `I take pride in my ability to deliver high-quality solutions and continuously learn new technologies. My experience with ${technologies.slice(0, 3).join(', ') || 'various technologies'} has enabled me to contribute meaningfully to every project I've worked on. I focus on writing clean, maintainable code and collaborating effectively with cross-functional teams to achieve project goals.`;
    }
    
    let response = "One piece of exceptional work I'm particularly proud of is ";
    
    if (achievements.length > 0) {
      response += achievements[0].trim() + ". ";
    } else if (projects.length > 0) {
      response += projects[0].trim() + ". ";
    }
    
    if (technologies.length > 0) {
      response += `This project involved working with ${technologies.slice(0, 3).join(', ')}, which strengthened my technical skills and problem-solving abilities. `;
    }
    
    response += "What made this work exceptional was not just the technical implementation, but also the impact it had on improving efficiency and user experience. I believe in going beyond just meeting requirements to deliver solutions that truly add value.";
    
    return response;
  }
  
  function generateBiggestAchievementResponse(achievements, projects, resumeData) {
    if (achievements.length === 0) {
      return `My biggest achievement has been successfully transitioning into the tech industry and continuously expanding my skill set. I've demonstrated the ability to quickly learn new technologies and contribute to complex projects. Building a strong foundation in software development while maintaining high code quality standards has been a significant personal and professional milestone.`;
    }
    
    return `My biggest achievement was ${achievements[0].trim()}. This accomplishment was significant because it demonstrated my ability to handle complex challenges, work collaboratively with team members, and deliver results that exceeded expectations. The experience taught me valuable lessons about perseverance, technical problem-solving, and the importance of continuous learning in the rapidly evolving tech landscape.`;
  }
  
  function generateWhyHireYouResponse(skills, achievements, resumeData) {
    const skillsList = skills || 'programming and problem-solving';
    return `You should hire me because I bring a unique combination of technical expertise and strong problem-solving abilities. My experience with ${skillsList} enables me to contribute immediately to your team while continuing to grow and learn. I'm passionate about writing clean, efficient code and collaborating effectively with cross-functional teams. My track record demonstrates my ability to deliver high-quality solutions on time while maintaining attention to detail. I'm committed to continuous learning and staying current with industry best practices, which allows me to bring fresh perspectives and innovative solutions to complex challenges.`;
  }
  
  function generateTechnicalChallengeResponse(projects, technologies, resumeData) {
    if (projects.length === 0) {
      return `One of the most challenging technical problems I've faced involved optimizing application performance and scalability. I approached this by first thoroughly analyzing the existing system to identify bottlenecks, then researching and implementing solutions using modern development practices. The process required careful planning, testing, and iterative improvements. This experience taught me the importance of systematic problem-solving and the value of leveraging the right tools and technologies for each specific challenge.`;
    }
    
    return `A significant technical challenge I encountered was ${projects[0].trim()}. To solve this, I broke down the problem into smaller, manageable components and researched various approaches before implementing a solution. The key was understanding the root cause rather than just treating symptoms. This experience reinforced my belief in the importance of thorough analysis, careful planning, and iterative testing when tackling complex technical problems.`;
  }
  
  function generateLeadershipResponse(text, projects, resumeData) {
    const hasLeadershipMentions = text.includes('led') || text.includes('managed') || text.includes('coordinated') || text.includes('mentored');
    
    if (hasLeadershipMentions) {
      return `I've had several opportunities to demonstrate leadership in both formal and informal settings. Whether leading project initiatives, mentoring junior team members, or coordinating cross-functional efforts, I focus on clear communication, collaborative decision-making, and empowering team members to do their best work. I believe effective leadership is about facilitating success for the entire team while maintaining high standards and ensuring project objectives are met.`;
    }
    
    return `While I may not have formal management experience, I've demonstrated leadership through initiative-taking, knowledge sharing, and helping team members overcome challenges. I believe leadership is about stepping up when needed, communicating effectively, and contributing to a positive team dynamic. I'm eager to grow my leadership skills and take on more responsibility as opportunities arise.`;
  }
  
  function generatePassionResponse(technologies, skills, resumeData) {
    const techList = technologies.slice(0, 3).join(', ') || 'technology';
    return `I'm deeply passionate about technology and its potential to solve real-world problems. Working with ${techList} energizes me because I love the continuous learning aspect of software development and the satisfaction of building solutions that make a meaningful impact. What drives me most is the opportunity to combine creativity with logical problem-solving, whether that's architecting elegant solutions, optimizing performance, or creating intuitive user experiences. I'm motivated by the collaborative nature of development work and the constant evolution of tools and best practices in our field.`;
  }

  // Analyze resume data to determine intelligent answers for common questions
  function analyzeResumeForSelections(resumeData) {
    const text = (resumeData.extractedText || '').toLowerCase();
    const experience = (resumeData.experience || '').toLowerCase();
    const education = (resumeData.education || '').toLowerCase();
    
    console.log('JobFlow: Analyzing resume text for smart selections...');
    
    // Work authorization analysis
    const hasUSCitizenship = text.includes('us citizen') || text.includes('american citizen') || 
                            text.includes('citizenship') || text.includes('naturalized');
    const hasGreenCard = text.includes('green card') || text.includes('permanent resident') || 
                        text.includes('lpr');
    const hasWorkVisa = text.includes('h-1b') || text.includes('h1b') || text.includes('opt') || 
                       text.includes('f-1') || text.includes('work visa');
    
    const canWorkInUS = hasUSCitizenship || hasGreenCard || hasWorkVisa;
    const needsSponsorship = hasWorkVisa || (!hasUSCitizenship && !hasGreenCard);
    
    // Years of experience analysis
    let experienceYears = 0;
    const expMatches = text.match(/(\d+)[\+\s]*years?\s+(?:of\s+)?(?:experience|exp)/gi);
    if (expMatches) {
      experienceYears = Math.max(...expMatches.map(m => parseInt(m.match(/\d+/)[0])));
    }
    
    // If no explicit years mentioned, try to count job positions/projects
    if (experienceYears === 0) {
      const jobTitles = (text.match(/software engineer|developer|programmer|analyst|consultant/gi) || []).length;
      const projects = (text.match(/project|built|developed|created|implemented/gi) || []).length;
      experienceYears = Math.min(Math.max(jobTitles, Math.floor(projects / 3)), 10);
    }
    
    let experienceRange = '0-1 years';
    let experienceFallbacks = ['0', '1', 'entry level', 'less than 1'];
    
    if (experienceYears >= 10) {
      experienceRange = '10+ years';
      experienceFallbacks = ['10+', '10', '15', 'senior', 'expert'];
    } else if (experienceYears >= 7) {
      experienceRange = '7-10 years';
      experienceFallbacks = ['7', '8', '9', '10', '7-10'];
    } else if (experienceYears >= 5) {
      experienceRange = '5-7 years';
      experienceFallbacks = ['5', '6', '7', '5-7'];
    } else if (experienceYears >= 3) {
      experienceRange = '3-5 years';
      experienceFallbacks = ['3', '4', '5', '3-5'];
    } else if (experienceYears >= 1) {
      experienceRange = '1-3 years';
      experienceFallbacks = ['1', '2', '3', '1-3'];
    }
    
    // Education analysis
    let educationLevel = 'High School';
    let educationFallbacks = ['high school', 'hs', 'diploma'];
    
    if (text.includes('phd') || text.includes('ph.d') || text.includes('doctorate')) {
      educationLevel = "PhD";
      educationFallbacks = ['phd', 'ph.d', 'doctorate', 'doctoral'];
    } else if (text.includes('master') || text.includes('mba') || text.includes('ms') || text.includes('ma')) {
      educationLevel = "Master's";
      educationFallbacks = ["master's", 'master', 'masters', 'mba', 'ms', 'ma'];
    } else if (text.includes('bachelor') || text.includes('bs') || text.includes('ba') || text.includes('undergraduate')) {
      educationLevel = "Bachelor's";
      educationFallbacks = ["bachelor's", 'bachelor', 'bachelors', 'bs', 'ba', 'undergraduate'];
    } else if (text.includes('associate') || text.includes('aa') || text.includes('as')) {
      educationLevel = "Associate's";
      educationFallbacks = ["associate's", 'associate', 'aa', 'as'];
    }
    
    // Security clearance analysis
    const hasSecurityClearance = text.includes('security clearance') || 
                                 text.includes('clearance') || 
                                 text.includes('secret') || 
                                 text.includes('top secret');
    
    // Remote work preference analysis
    let remoteWorkPreference = 'Hybrid'; // Default to hybrid as most flexible
    if (text.includes('remote work') || text.includes('work remotely') || text.includes('distributed team')) {
      remoteWorkPreference = 'Remote';
    } else if (text.includes('on-site') || text.includes('office') || text.includes('in-person')) {
      remoteWorkPreference = 'On-site';
    }
    
    // Gender extraction from resume
    let gender = '';
    const genderMatch = text.match(/gender:\s*(fe(?:male)?|male|m|f|other)/i);
    if (genderMatch) {
      const extractedGender = genderMatch[1].toLowerCase();
      if (extractedGender.startsWith('fe') || extractedGender === 'f') {
        gender = 'Female';
      } else if (extractedGender.startsWith('male') || extractedGender === 'm') {
        gender = 'Male';
      } else {
        gender = genderMatch[1];
      }
    }
    
    return {
      canWorkInUS,
      needsSponsorship,
      experienceYears,
      experienceRange,
      experienceFallbacks,
      educationLevel,
      educationFallbacks,
      hasSecurityClearance,
      remoteWorkPreference,
      gender
    };
  }

  // Helper function to get surrounding text context for an element
  function getSurroundingText(element) {
    let context = '';
    
    // Check parent elements for context
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const textContent = parent.textContent || '';
      if (textContent.length > context.length) {
        context = textContent;
      }
      parent = parent.parentElement;
      depth++;
    }
    
    // Also check labels
    const labels = document.querySelectorAll('label');
    for (let label of labels) {
      if (label.contains(element) || (element.id && label.getAttribute('for') === element.id)) {
        context += ' ' + label.textContent;
      }
    }
    
    return context.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  
  // Helper function to handle smart selection for dropdowns and radio buttons
  function handleSmartSelection(element, selection) {
    if (element.tagName.toLowerCase() === 'select') {
      // Handle dropdown selection
      const options = Array.from(element.options);
      console.log(`    Dropdown has ${options.length} options:`, options.map(o => o.textContent.trim()));
      
      // Try preferred answer first
      let selectedOption = options.find(option => 
        option.textContent.toLowerCase().includes(selection.preferredAnswer.toLowerCase())
      );
      
      // Try fallback answers
      if (!selectedOption) {
        for (let fallback of selection.fallbackAnswers) {
          selectedOption = options.find(option => 
            option.textContent.toLowerCase().includes(fallback.toLowerCase()) ||
            option.value.toLowerCase().includes(fallback.toLowerCase())
          );
          if (selectedOption) break;
        }
      }
      
      if (selectedOption) {
        element.value = selectedOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`    Selected: "${selectedOption.textContent.trim()}"`);
        return true;
      }
    } else if (element.type === 'radio') {
      // Handle radio button selection
      const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
      console.log(`    Radio group "${element.name}" has ${radioGroup.length} options`);
      
      for (let radio of radioGroup) {
        const radioContext = getSurroundingText(radio);
        console.log(`      Option: "${radioContext.substring(0, 50)}..."`);
        
        // Check if this radio matches preferred answer
        const isPreferred = selection.preferredAnswer.toLowerCase() === radioContext.toLowerCase() ||
                           radioContext.includes(selection.preferredAnswer.toLowerCase());
        
        if (isPreferred) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`    Selected radio: "${radioContext.substring(0, 50)}..."`);
          return true;
        }
      }
      
      // Try fallback answers for radio buttons
      for (let fallback of selection.fallbackAnswers) {
        for (let radio of radioGroup) {
          const radioContext = getSurroundingText(radio);
          if (radioContext.includes(fallback)) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`    Selected radio (fallback): "${radioContext.substring(0, 50)}..."`);
            return true;
          }
        }
      }
    }
    
    return false;
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