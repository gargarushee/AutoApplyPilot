// Auto-fill function that runs in page context (all functions defined at top)
function executeAutoFillScript(resumeData) {
  // This function runs in the context of the web page
  let totalFilled = 0;
  const forms = document.querySelectorAll('form');

  // ALL HELPER FUNCTIONS MUST BE DEFINED FIRST
  
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

  function generateIntelligentResponses(resumeData) {
    const text = (resumeData.extractedText || '').toLowerCase();
    const experience = (resumeData.experience || '');
    const skills = Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : (resumeData.skills || '');
    
    console.log('JobFlow: Generating intelligent responses from resume content...');
    
    // Extract achievements and projects from resume text
    const achievements = extractAchievements(text);
    const projects = extractProjects(text);
    const technologies = extractTechnologies(text);
    
    return {
      exceptionalWork: generateExceptionalWorkResponse(achievements, projects, technologies, resumeData),
      biggestAchievement: generateBiggestAchievementResponse(achievements, projects, resumeData),
      whyHireYou: generateWhyHireYouResponse(skills, achievements, resumeData),
      technicalChallenge: generateTechnicalChallengeResponse(projects, technologies, resumeData),
      leadershipExperience: generateLeadershipResponse(text, projects, resumeData),
      passion: generatePassionResponse(technologies, skills, resumeData)
    };
  }

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
    const authorizedToWork = text.includes('authorized to work') || text.includes('authorized to w');
    
    const canWorkInUS = hasUSCitizenship || hasGreenCard || hasWorkVisa || authorizedToWork;
    const needsSponsorship = hasWorkVisa || (!hasUSCitizenship && !hasGreenCard && !authorizedToWork);
    
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
    let remoteWorkPreference = 'Hybrid';
    if (text.includes('remote work') || text.includes('work remotely') || text.includes('distributed team')) {
      remoteWorkPreference = 'Remote';
    } else if (text.includes('on-site') || text.includes('office') || text.includes('in-person')) {
      remoteWorkPreference = 'On-site';
    }
    
    // Demographic information analysis
    let gender = null;
    if (text.includes('gender: female') || text.includes('gender:female')) {
      gender = 'Female';
    } else if (text.includes('gender: male') || text.includes('gender:male')) {
      gender = 'Male';
    } else if (text.includes('male') && !text.includes('female')) {
      gender = 'Male';
    } else if (text.includes('female')) {
      gender = 'Female';
    }
    
    let veteranStatus = null;
    if (text.includes('veteran') || text.includes('military service') || text.includes('armed forces') || 
        text.includes('navy') || text.includes('army') || text.includes('air force') || text.includes('marines')) {
      if (text.includes('disabled veteran') || text.includes('campaign badge') || 
          text.includes('recently separated') || text.includes('armed forces service medal')) {
        veteranStatus = 'I identify as one or more of the classifications of protected veteran';
      } else {
        veteranStatus = 'I am a veteran, but I am not a protected veteran';
      }
    }
    
    let disabilityStatus = null;
    if (text.includes('disability') || text.includes('disabled') || text.includes('accommodation') || 
        text.includes('impairment')) {
      disabilityStatus = 'Yes, I have a disability (or previously had a disability)';
    }
    
    let ethnicity = null;
    if (text.includes('hispanic') || text.includes('latino') || text.includes('latina')) {
      ethnicity = 'Hispanic or Latino';
    } else if (text.includes('asian') || text.includes('indian') || text.includes('chinese') || text.includes('japanese')) {
      ethnicity = 'Asian';
    } else if (text.includes('black') || text.includes('african american')) {
      ethnicity = 'Black or African American';
    } else if (text.includes('white') || text.includes('caucasian')) {
      ethnicity = 'White';
    } else if (text.includes('native american') || text.includes('american indian')) {
      ethnicity = 'American Indian or Alaska Native';
    } else if (text.includes('pacific islander') || text.includes('hawaiian')) {
      ethnicity = 'Native Hawaiian or Other Pacific Islander';
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
      gender,
      veteranStatus,
      disabilityStatus,
      ethnicity
    };
  }

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
  
  function handleSmartSelection(element, selection) {
    if (element.tagName.toLowerCase() === 'select') {
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
      const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
      console.log(`    Radio group "${element.name}" has ${radioGroup.length} options`);
      
      for (let radio of radioGroup) {
        const radioContext = getSurroundingText(radio);
        console.log(`      Option: "${radioContext.substring(0, 50)}..."`);
        
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

  // MAIN EXECUTION STARTS HERE

  console.log('JobFlow: Auto-fill script executing with data:', resumeData);
  console.log(`JobFlow: Found ${forms.length} total forms on page`);

  // Generate analysis and responses
  const resumeAnalysis = analyzeResumeForSelections(resumeData);
  console.log('JobFlow: Resume analysis results:', resumeAnalysis);

  const generatedResponses = generateIntelligentResponses(resumeData);
  console.log('JobFlow: Generated intelligent responses:', generatedResponses);

  // Parse resume data for form filling
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
    coverLetter: resumeData.coverLetter || generatedResponses.whyHireYou,
    linkedinUrl: resumeData.linkedinUrl || 'https://linkedin.com/in/arusheegarg',
    githubUrl: resumeData.githubUrl || '',
    websiteUrl: resumeData.websiteUrl || ''
  };

  // Process each form
  forms.forEach((form, formIndex) => {
    console.log(`JobFlow: Processing form ${formIndex + 1}/${forms.length}`);
    
    // Basic field mappings
    const fieldMappings = [
      { 
        selectors: ['input[aria-label*="First Name" i]', 'input[placeholder*="First" i]', 'input[name*="first" i]', 'form input[type="text"]:first-of-type'], 
        value: parsedData.firstName,
        type: 'firstName'
      },
      { 
        selectors: ['input[aria-label*="Last Name" i]', 'input[placeholder*="Last" i]', 'input[name*="last" i]', 'form input[type="text"]:nth-of-type(2)'], 
        value: parsedData.lastName,
        type: 'lastName'
      },
      { 
        selectors: ['input[type="email"]:not([name*="your-"])', 'input[aria-label*="Email" i]', 'input[placeholder*="Email" i]'], 
        value: parsedData.email,
        type: 'email'
      },
      { 
        selectors: ['input[type="tel"]', 'input[aria-label*="Phone" i]', 'input[placeholder*="Phone" i]'], 
        value: parsedData.phone,
        type: 'phone'
      },
      { 
        selectors: ['input[aria-label*="Location" i]', 'input[placeholder*="Location" i]', 'input[name*="location" i]'], 
        value: parsedData.city || 'San Francisco, CA',
        type: 'location'
      },
      { 
        selectors: ['input[aria-label*="LinkedIn" i]', 'input[placeholder*="LinkedIn" i]', 'textarea[placeholder*="LinkedIn" i]'], 
        value: parsedData.linkedinUrl,
        type: 'linkedin'
      }
    ];

    // Smart selections for dropdowns
    const smartSelections = [
      {
        patterns: ['sponsorship', 'visa', 'h-1b', 'work authorization', 'legally authorized'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.needsSponsorship ? 'Yes' : 'No',
        fallbackAnswers: resumeAnalysis.needsSponsorship ? ['yes', 'true', '1'] : ['no', 'false', '0'],
        type: 'visaSponsorship'
      },
      {
        patterns: ['eligible.*work.*us', 'authorized.*work.*united states', 'legally.*work.*us'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.canWorkInUS ? 'Yes' : 'No',
        fallbackAnswers: resumeAnalysis.canWorkInUS ? ['yes', 'true', '1'] : ['no', 'false', '0'],
        type: 'workEligibility'
      },
      {
        patterns: ['gender', 'sex', 'identify.*gender'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.gender || 'Decline To Self Identify',
        fallbackAnswers: ['male', 'female', 'decline', 'prefer not to say'],
        type: 'gender'
      },
      {
        patterns: ['veteran', 'military', 'armed forces', 'service member'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.veteranStatus || 'I am not a protected veteran',
        fallbackAnswers: ['not a veteran', 'no', 'not protected', 'civilian'],
        type: 'veteranStatus'
      },
      {
        patterns: ['disability', 'disabled', 'impairment', 'accommodation'],
        selectors: ['select', 'input[type="radio"]'],
        preferredAnswer: resumeAnalysis.disabilityStatus || 'I do not have a disability',
        fallbackAnswers: ['no', 'do not have', 'not disabled', 'no disability'],
        type: 'disabilityStatus'
      }
    ];

    // Generative text mappings
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
      }
    ];

    // Fill basic fields
    fieldMappings.forEach(mapping => {
      if (!mapping.value) return;
      
      console.log(`JobFlow: Looking for ${mapping.type} fields with value: "${mapping.value}"`);
      let foundFields = 0;

      mapping.selectors.forEach(selector => {
        try {
          const fields = Array.from(form.querySelectorAll(selector));
          console.log(`  Selector "${selector}": found ${fields.length} fields`);
          
          if (fields.length > 0 && foundFields === 0) {
            const field = fields[0];
            console.log(`    Found field: ${field.tagName} placeholder="${field.placeholder}" name="${field.name}" id="${field.id}"`);
            
            if (field.value && field.value.trim()) {
              console.log(`    Skipping - field already has value: "${field.value}"`);
              return;
            }
            
            console.log(`    Filling ${field.tagName} field with: "${mapping.value}"`);
            field.value = mapping.value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('blur', { bubbles: true }));
            
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

    // Handle smart selections for dropdowns
    console.log('JobFlow: Processing smart selections for dropdowns and radio buttons...');
    
    smartSelections.forEach(selection => {
      console.log(`JobFlow: Looking for ${selection.type} fields...`);
      
      const allElements = form.querySelectorAll(selection.selectors.join(', '));
      console.log(`  Found ${allElements.length} potential ${selection.selectors.join('/')} elements`);
      
      allElements.forEach((element, index) => {
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

    // Handle generative text responses
    console.log('JobFlow: Processing generative text fields...');
    
    generativeFieldMappings.forEach(mapping => {
      if (!mapping.value) {
        console.log(`JobFlow: Skipping ${mapping.type} - no generated response available`);
        return;
      }

      console.log(`JobFlow: Looking for ${mapping.type} fields...`);
      let foundFields = 0;

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
  });

  // Handle resume file attachment
  console.log('JobFlow: Looking for file upload fields...');
  
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log(`JobFlow: Found ${fileInputs.length} file input fields`);
  
  if (fileInputs.length > 0 && resumeData.filename) {
    fileInputs.forEach((fileInput, index) => {
      console.log(`JobFlow: Processing file input ${index + 1}:`);
      console.log(`  Input: accept="${fileInput.accept}" name="${fileInput.name}"`);
      
      const parentText = fileInput.parentElement?.textContent?.toLowerCase() || '';
      const isResumeField = parentText.includes('resume') || 
                           parentText.includes('cv') || 
                           fileInput.accept?.includes('.pdf') ||
                           fileInput.accept?.includes('application/pdf');
      
      if (isResumeField) {
        console.log('  This appears to be a resume upload field');
        
        try {
          const resumeContent = resumeData.extractedText || 'Resume content';
          const file = new File([resumeContent], resumeData.filename || 'resume.txt', {
            type: 'text/plain',
            lastModified: Date.now()
          });
          
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          
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