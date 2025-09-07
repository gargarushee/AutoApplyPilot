# JobFlow Auto-Fill Browser Extension

A Chrome browser extension that automatically fills job application forms with your resume data.

## Installation Instructions

### Step 1: Download the Extension
1. Download all files in the `browser-extension` folder to your computer
2. Keep all files in the same folder structure

### Step 2: Install in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" button
4. Select the `browser-extension` folder
5. The extension should now appear in your extensions list

### Step 3: Setup
1. Make sure your JobFlow dashboard is running at `http://localhost:5000`
2. Upload your resume in the JobFlow dashboard
3. The extension will automatically connect to your resume data

## How to Use

### Automatic Detection
- The extension automatically detects when you're on a job application page
- Look for the blue floating "Auto-Fill" button on job sites
- The extension icon will show a blue dot when active

### Manual Activation
- Click the JobFlow extension icon in your browser toolbar
- The popup will show your resume status and available actions
- Click "Auto-Fill Forms" to populate all detected form fields

### Supported Sites
- ✅ Lever job boards
- ✅ Greenhouse applications  
- ✅ Workday career sites
- ✅ Jobvite applications
- ✅ Most standard job application forms

## Features

- **Smart Form Detection**: Automatically finds name, email, phone, experience, and skills fields
- **One-Click Auto-Fill**: Fill entire forms with a single click
- **Visual Feedback**: See exactly which fields were filled
- **Resume Preview**: View your resume data before filling
- **Universal Compatibility**: Works on any job site with standard form fields

## Troubleshooting

### Extension Not Working
1. Ensure JobFlow dashboard is running at `http://localhost:5000`
2. Check that you have uploaded a resume in the dashboard
3. Refresh the job application page
4. Try disabling and re-enabling the extension

### No Forms Detected
1. Refresh the page and wait for it to fully load
2. Check if the page has fillable form fields
3. Some sites use non-standard form elements that may not be detected

### Auto-Fill Not Working
1. Click the extension icon to check connection status
2. Try the "Preview Data" button to verify resume data is loaded
3. Some protected fields may not be fillable for security reasons

## Configuration

To change the JobFlow server URL:
1. Edit `content.js` and `popup.js`
2. Update the `apiBase` variable to your server URL
3. Reload the extension in Chrome

## Security & Privacy

- The extension only reads form fields, never submits forms automatically
- Resume data is only transmitted between your local JobFlow app and the extension
- No data is sent to external servers
- The extension only activates on job-related websites