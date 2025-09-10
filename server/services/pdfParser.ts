export interface ExtractedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  experience?: string;
  skills?: string[];
  education?: string;
}

export class PDFParserService {
  static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      console.log('Parsing PDF - file size:', buffer.length, 'bytes');
      
      // Alternative approach - parse buffer directly without pdf-parse dependency
      const text = buffer.toString('utf8');
      
      // If it contains PDF markers, try to extract readable text
      if (text.includes('%PDF')) {
        // Simple text extraction from PDF (basic approach)
        const textMatch = text.match(/BT\s*(.*?)\s*ET/gs);
        if (textMatch) {
          const extractedText = textMatch.map(match => 
            match.replace(/BT|ET/g, '').trim()
          ).join(' ').replace(/[^\w\s@.-]/g, ' ').replace(/\s+/g, ' ').trim();
          console.log('PDF text extracted successfully, length:', extractedText.length);
          return extractedText;
        }
      }
      
      // If no PDF text found, try to use filename for basic extraction
      console.log('PDF text extraction failed, using filename fallback');
      return '';
    } catch (error) {
      console.error('PDF parsing failed:', error);
      return '';
    }
  }

  static extractStructuredData(text: string, filename?: string): ExtractedResumeData {
    const data: ExtractedResumeData = {};

    console.log('=== PDF PARSING DEBUG ===');
    console.log('Filename:', filename);
    console.log('Text length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    // If we have no text but have a filename, try to extract name from filename
    if (!text && filename) {
      const fileBaseName = filename.replace(/\.(pdf|doc|docx)$/i, '');
      const cleanName = fileBaseName.replace(/[-_]/g, ' ').replace(/resume|cv/gi, '').trim();
      
      // Check if it looks like a name (2-4 words, only letters and spaces)
      if (cleanName.split(' ').length >= 2 && cleanName.split(' ').length <= 4 && 
          /^[A-Za-z\s]+$/.test(cleanName)) {
        data.fullName = cleanName.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        console.log('Extracted name from filename:', data.fullName);
      }
    }

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      data.email = emailMatch[0];
    }

    // Extract phone number
    const phoneMatch = text.match(/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) {
      data.phone = phoneMatch[0];
    }

    // Extract name (simple heuristic - first line that looks like a name)
    if (!data.fullName) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log('First 10 lines of PDF:', lines.slice(0, 10));
      for (const line of lines.slice(0, 5)) {
        if (line.split(' ').length >= 2 && line.split(' ').length <= 4 && 
            /^[A-Za-z\s]+$/.test(line) && !line.toLowerCase().includes('resume')) {
          data.fullName = line;
          console.log('Extracted name from PDF text:', data.fullName);
          break;
        }
      }
    }

    // Extract experience (look for years)
    const experienceMatch = text.match(/(\d+)[\+\s]*years?\s+(?:of\s+)?(?:experience|exp)/i);
    if (experienceMatch) {
      const years = parseInt(experienceMatch[1]);
      if (years <= 2) data.experience = '0-2 years';
      else if (years <= 5) data.experience = '3-5 years';
      else if (years <= 7) data.experience = '5-7 years';
      else if (years <= 10) data.experience = '7-10 years';
      else data.experience = '10+ years';
    }

    // Extract skills (common programming languages and technologies)
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java',
      'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'HTML', 'CSS',
      'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes',
      'AWS', 'Azure', 'GCP', 'Git', 'Jenkins', 'CI/CD', 'REST', 'GraphQL'
    ];
    
    const foundSkills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    data.skills = foundSkills;

    // Extract education (simple heuristic)
    const educationMatch = text.match(/(Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.|M\.A\.).*?(?:\n|$)/i);
    if (educationMatch) {
      data.education = educationMatch[0].trim();
    }

    console.log('Final extracted data:', data);
    console.log('=== END PDF PARSING DEBUG ===');
    return data;
  }
}
