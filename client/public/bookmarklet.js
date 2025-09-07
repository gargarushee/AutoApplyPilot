// JobFlow Auto-Fill Bookmarklet
(function() {
  'use strict';

  // Prevent multiple injections
  if (window.JobFlowAutoFill) {
    window.JobFlowAutoFill.showUI();
    return;
  }

  const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin;

  window.JobFlowAutoFill = {
    resumeData: null,
    ui: null,
    
    async init() {
      try {
        await this.loadResumeData();
        this.detectAndFillForms();
        this.showUI();
      } catch (error) {
        console.error('JobFlow Auto-Fill error:', error);
        this.showError('Failed to load resume data. Make sure you have uploaded a resume.');
      }
    },

    async loadResumeData() {
      const response = await fetch(`${API_BASE}/api/bookmarklet/resume-data`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      this.resumeData = data;
    },

    detectAndFillForms() {
      if (!this.resumeData) return;

      const forms = document.querySelectorAll('form');
      let filledFields = 0;

      forms.forEach(form => {
        // Common field mappings
        const fieldMappings = [
          // Name fields
          { selectors: ['input[name*="first"], input[id*="first"], input[placeholder*="first" i]'], value: this.resumeData.firstName },
          { selectors: ['input[name*="last"], input[id*="last"], input[placeholder*="last" i]'], value: this.resumeData.lastName },
          { selectors: ['input[name*="name"], input[id*="name"], input[placeholder*="full name" i], input[placeholder*="name" i]'], value: this.resumeData.fullName, priority: 'low' },
          
          // Contact fields
          { selectors: ['input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email" i]'], value: this.resumeData.email },
          { selectors: ['input[type="tel"], input[name*="phone"], input[id*="phone"], input[placeholder*="phone" i]'], value: this.resumeData.phone },
          
          // Experience and skills
          { selectors: ['textarea[name*="experience"], textarea[id*="experience"], textarea[placeholder*="experience" i]'], value: this.resumeData.experience },
          { selectors: ['textarea[name*="skill"], textarea[id*="skill"], textarea[placeholder*="skill" i]'], value: Array.isArray(this.resumeData.skills) ? this.resumeData.skills.join(', ') : this.resumeData.skills },
          { selectors: ['textarea[name*="education"], textarea[id*="education"], textarea[placeholder*="education" i]'], value: this.resumeData.education },
        ];

        fieldMappings.forEach(mapping => {
          if (!mapping.value) return;

          mapping.selectors.forEach(selector => {
            const fields = form.querySelectorAll(selector);
            fields.forEach(field => {
              // Skip if field is already filled (unless it's low priority)
              if (field.value && mapping.priority !== 'low') return;
              
              field.value = mapping.value;
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              filledFields++;
            });
          });
        });
      });

      console.log(`JobFlow: Auto-filled ${filledFields} form fields`);
      return filledFields;
    },

    showUI() {
      if (this.ui) {
        this.ui.style.display = 'block';
        return;
      }

      // Create floating UI
      this.ui = document.createElement('div');
      this.ui.id = 'jobflow-autofill-ui';
      this.ui.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          max-width: 320px;
          color: #1f2937;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
              <strong style="color: #3b82f6;">JobFlow Auto-Fill</strong>
            </div>
            <button id="jobflow-close" style="
              background: none;
              border: none;
              font-size: 18px;
              cursor: pointer;
              color: #6b7280;
              padding: 0;
              line-height: 1;
            ">&times;</button>
          </div>
          
          <div style="margin-bottom: 12px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
            <div style="font-weight: 500; margin-bottom: 4px;">Resume: ${this.resumeData?.filename || 'Unknown'}</div>
            <div style="font-size: 12px; color: #6b7280;">
              ${this.resumeData?.fullName || 'No name'} • ${this.resumeData?.email || 'No email'}
            </div>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="jobflow-fill" style="
              flex: 1;
              background: #3b82f6;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 13px;
            ">Fill Forms</button>
            <button id="jobflow-hide" style="
              background: #f3f4f6;
              color: #6b7280;
              border: none;
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            ">Hide</button>
          </div>
        </div>
      `;

      document.body.appendChild(this.ui);

      // Event listeners
      document.getElementById('jobflow-close').onclick = () => this.remove();
      document.getElementById('jobflow-hide').onclick = () => this.ui.style.display = 'none';
      document.getElementById('jobflow-fill').onclick = () => {
        const filled = this.detectAndFillForms();
        this.showSuccess(`Auto-filled ${filled} form fields!`);
      };
    },

    showError(message) {
      alert(`JobFlow Auto-Fill: ${message}`);
    },

    showSuccess(message) {
      const button = document.getElementById('jobflow-fill');
      if (button) {
        const original = button.textContent;
        button.textContent = '✓ Filled!';
        button.style.background = '#10b981';
        setTimeout(() => {
          button.textContent = original;
          button.style.background = '#3b82f6';
        }, 2000);
      }
    },

    remove() {
      if (this.ui) {
        this.ui.remove();
        this.ui = null;
      }
      delete window.JobFlowAutoFill;
      delete window.jobFlowInjected;
    }
  };

  // Auto-start
  window.JobFlowAutoFill.init();
})();