import axios from 'axios';
import * as cheerio from 'cheerio';

export interface JobInfo {
  title: string;
  company: string;
  location?: string;
  platform: string;
  formFields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>;
}

export class JobParserService {
  static async parseJobUrl(url: string): Promise<JobInfo> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept redirects and client errors
      });

      // Check if we got a Cloudflare or bot protection page
      if (response.status === 403 || 
          response.data.includes('cloudflare') || 
          response.data.includes('challenge-platform') ||
          response.data.includes('captcha')) {
        console.warn('Bot protection detected for URL:', url);
        return this.createFallbackJobInfo(url);
      }

      const $ = cheerio.load(response.data);
      const platform = this.detectPlatform(url);

      let jobInfo: JobInfo = {
        title: '',
        company: '',
        location: '',
        platform,
        formFields: []
      };

      switch (platform) {
        case 'Lever':
          jobInfo = this.parseLeverJob($, url);
          break;
        case 'Greenhouse':
          jobInfo = this.parseGreenhouseJob($, url);
          break;
        case 'Workday':
          jobInfo = this.parseWorkdayJob($, url);
          break;
        default:
          jobInfo = this.parseGenericJob($, url);
      }

      // Fallback if parsing failed to extract basic info
      if (!jobInfo.title || !jobInfo.company) {
        console.warn('Failed to extract job info, using fallback for:', url);
        return this.createFallbackJobInfo(url);
      }

      return jobInfo;
    } catch (error: any) {
      console.error('Error parsing job URL:', error.message);
      
      // Check if it's a network/access error
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.response?.status === 403) {
        console.warn('Network or access error, using fallback for:', url);
        return this.createFallbackJobInfo(url);
      }
      
      throw new Error('Failed to parse job posting. The website may be blocking automated access. Please try a different URL or contact support.');
    }
  }

  private static detectPlatform(url: string): string {
    if (url.includes('lever.co')) return 'Lever';
    if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) return 'Greenhouse';
    if (url.includes('myworkdayjobs.com')) return 'Workday';
    if (url.includes('jobvite.com')) return 'Jobvite';
    if (url.includes('smartrecruiters.com')) return 'SmartRecruiters';
    return 'Generic';
  }

  private static parseLeverJob($: cheerio.CheerioAPI, url: string): JobInfo {
    const title = $('.posting-headline h2').text().trim() || $('h1').first().text().trim();
    const company = $('.posting-headline .posting-headline-meta .posting-headline-company').text().trim();
    const location = $('.posting-headline .posting-headline-meta .posting-headline-location').text().trim();

    const formFields = this.extractFormFields($);

    return {
      title,
      company,
      location,
      platform: 'Lever',
      formFields
    };
  }

  private static parseGreenhouseJob($: cheerio.CheerioAPI, url: string): JobInfo {
    const title = $('#header .app-title').text().trim() || $('h1').first().text().trim();
    const company = $('.company-name').text().trim() || $('.header-company-name').text().trim();
    const location = $('.location').text().trim();

    const formFields = this.extractFormFields($);

    return {
      title,
      company,
      location,
      platform: 'Greenhouse',
      formFields
    };
  }

  private static parseWorkdayJob($: cheerio.CheerioAPI, url: string): JobInfo {
    const title = $('[data-automation-id="jobPostingHeader"]').text().trim() || $('h1').first().text().trim();
    const company = $('[data-automation-id="company"]').text().trim();
    const location = $('[data-automation-id="jobPostingLocation"]').text().trim();

    const formFields = this.extractFormFields($);

    return {
      title,
      company,
      location,
      platform: 'Workday',
      formFields
    };
  }

  private static parseGenericJob($: cheerio.CheerioAPI, url: string): JobInfo {
    // Generic parsing for unknown platforms
    const title = $('h1').first().text().trim() || $('[class*="title"]').first().text().trim();
    const company = $('[class*="company"]').first().text().trim() || $('[class*="employer"]').first().text().trim();
    const location = $('[class*="location"]').first().text().trim();

    const formFields = this.extractFormFields($);

    return {
      title: title || 'Unknown Position',
      company: company || 'Unknown Company',
      location,
      platform: 'Generic',
      formFields
    };
  }

  private static extractFormFields($: cheerio.CheerioAPI): Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }> {
    const fields: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
      options?: string[];
    }> = [];

    // Extract input fields
    $('input, select, textarea').each((index, element) => {
      const $el = $(element);
      const name = $el.attr('name') || $el.attr('id') || `field_${index}`;
      const type = $el.attr('type') || element.tagName.toLowerCase();
      const required = $el.attr('required') !== undefined || $el.attr('aria-required') === 'true';
      
      // Try to find label
      let label = '';
      const labelFor = $(`label[for="${$el.attr('id')}"]`).text().trim();
      if (labelFor) {
        label = labelFor;
      } else {
        // Look for nearby text that might be a label
        const parent = $el.parent();
        label = parent.find('label').first().text().trim() || 
                parent.prev('label').text().trim() ||
                parent.text().replace($el.text(), '').trim().slice(0, 50);
      }

      // Extract options for select elements
      let options: string[] | undefined;
      if (element.tagName.toLowerCase() === 'select') {
        options = [];
        $el.find('option').each((_, option) => {
          const optionText = $(option).text().trim();
          if (optionText && optionText !== 'Select...') {
            options!.push(optionText);
          }
        });
      }

      if (name && label) {
        fields.push({
          name,
          type,
          label: label || name,
          required,
          ...(options && { options })
        });
      }
    });

    // Add common fields if not found
    const commonFields = [
      { name: 'firstName', type: 'text', label: 'First Name', required: true },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true },
      { name: 'phone', type: 'tel', label: 'Phone Number', required: true },
      { name: 'resume', type: 'file', label: 'Resume', required: true },
      { name: 'coverLetter', type: 'textarea', label: 'Cover Letter', required: false },
    ];

    const existingFieldNames = fields.map(f => f.name.toLowerCase());
    
    commonFields.forEach(commonField => {
      const hasField = existingFieldNames.some(name => 
        name.includes(commonField.name.toLowerCase()) ||
        commonField.name.toLowerCase().includes(name)
      );
      
      if (!hasField) {
        fields.push(commonField);
      }
    });

    return fields;
  }

  private static createFallbackJobInfo(url: string): JobInfo {
    const platform = this.detectPlatform(url);
    
    // Extract basic info from URL if possible
    let company = 'Unknown Company';
    let title = 'Unknown Position';
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Try to extract company from domain
      if (hostname.includes('lever.co')) {
        const pathParts = urlObj.pathname.split('/');
        company = pathParts[1] || 'Unknown Company';
      } else if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse.io')) {
        const pathParts = urlObj.pathname.split('/');
        company = pathParts[1] || 'Unknown Company';
      } else if (hostname.includes('myworkdayjobs.com')) {
        const subdomain = hostname.split('.')[0];
        company = subdomain.replace('myworkdayjobs', '').replace('-', ' ') || 'Unknown Company';
      } else {
        // Generic domain parsing
        const domainParts = hostname.split('.');
        if (domainParts.length > 2) {
          company = domainParts[domainParts.length - 2];
        }
      }
      
      company = company.charAt(0).toUpperCase() + company.slice(1);
    } catch (e) {
      console.warn('Failed to parse URL for fallback info:', e);
    }

    return {
      title,
      company,
      location: '',
      platform,
      formFields: [
        { name: 'firstName', type: 'text', label: 'First Name', required: true },
        { name: 'lastName', type: 'text', label: 'Last Name', required: true },
        { name: 'email', type: 'email', label: 'Email Address', required: true },
        { name: 'phone', type: 'tel', label: 'Phone Number', required: true },
        { name: 'resume', type: 'file', label: 'Resume', required: true },
        { name: 'coverLetter', type: 'textarea', label: 'Cover Letter', required: false },
      ]
    };
  }
}
