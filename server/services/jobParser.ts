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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

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

      return jobInfo;
    } catch (error) {
      console.error('Error parsing job URL:', error);
      throw new Error('Failed to parse job posting. Please check the URL and try again.');
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
}
