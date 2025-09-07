import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { PDFParserService } from "./services/pdfParser";
import { JobParserService } from "./services/jobParser";
import { 
  insertUserSchema,
  insertResumeSchema,
  insertJobApplicationSchema,
  insertApplicationActivitySchema
} from "@shared/schema";
// Object storage import removed - using simple file handling for demo

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Mock authentication middleware for demo
  const mockAuth = (req: any, res: any, next: any) => {
    // For demo purposes, create a mock user
    req.user = {
      id: 'demo-user-id',
      username: 'demo',
      email: 'demo@example.com',
      fullName: 'Alex Johnson'
    };
    next();
  };

  // Ensure demo user exists
  app.use(async (req: any, res, next) => {
    const existingUser = await storage.getUser('demo-user-id');
    if (!existingUser) {
      await storage.createUser({
        username: 'demo',
        password: 'demo',
        email: 'demo@example.com',
        fullName: 'Alex Johnson',
        phone: '+1 (555) 123-4567',
        currentResumeId: null
      });
    }
    next();
  });

  // Serve bookmarklet script
  app.get("/bookmarklet.js", (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(process.cwd(), 'client/public/bookmarklet.js'));
  });

  // Simplified endpoints for demo - object storage removed for now

  // Resume endpoints
  app.post("/api/resumes/upload", mockAuth, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // For demo purposes, create a simple path reference
      const filename = `${Date.now()}-${req.file.originalname}`;
      const objectPath = `/demo-uploads/${filename}`;

      // Extract text and data from PDF (with error handling)
      let extractedText = '';
      let extractedData = {};
      
      try {
        extractedText = await PDFParserService.extractTextFromBuffer(req.file.buffer);
        extractedData = PDFParserService.extractStructuredData(extractedText);
      } catch (error) {
        console.warn('PDF parsing failed, will create resume without extracted data:', error);
        // Continue without extracted data - user can still upload and manage resumes
      }

      // Create resume record
      const resume = await storage.createResume({
        userId: req.user.id,
        filename: req.file.originalname,
        objectPath,
        extractedText,
        extractedData
      });

      // Update user's current resume
      await storage.updateUser(req.user.id, { currentResumeId: resume.id });

      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        applicationId: null,
        action: 'uploaded',
        message: `Uploaded new resume: ${req.file.originalname}`
      });

      res.json({ resume });
    } catch (error) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ error: "Failed to upload resume" });
    }
  });

  app.get("/api/resumes", mockAuth, async (req: any, res) => {
    try {
      const resumes = await storage.getResumesByUserId(req.user.id);
      res.json(resumes);
    } catch (error) {
      console.error("Error fetching resumes:", error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // API endpoint for bookmarklet to get resume data
  app.get("/api/bookmarklet/resume-data", async (req, res) => {
    try {
      // For demo, get the demo user's current resume
      const user = await storage.getUser('demo-user-id');
      if (!user?.currentResumeId) {
        return res.json({ error: 'No resume uploaded' });
      }
      
      const resume = await storage.getResume(user.currentResumeId);
      if (!resume) {
        return res.json({ error: 'Resume not found' });
      }

      // Return structured resume data for auto-filling
      const resumeData = {
        fullName: resume.extractedData?.fullName || user.fullName || '',
        firstName: (resume.extractedData?.fullName || user.fullName || '').split(' ')[0] || '',
        lastName: (resume.extractedData?.fullName || user.fullName || '').split(' ').slice(1).join(' ') || '',
        email: resume.extractedData?.email || user.email || '',
        phone: resume.extractedData?.phone || user.phone || '',
        experience: resume.extractedData?.experience || '',
        skills: resume.extractedData?.skills || [],
        education: resume.extractedData?.education || '',
        filename: resume.filename
      };

      res.json(resumeData);
    } catch (error) {
      console.error("Error fetching resume data for bookmarklet:", error);
      res.status(500).json({ error: "Failed to fetch resume data" });
    }
  });

  // Job application endpoints
  app.post("/api/jobs/parse", mockAuth, async (req: any, res) => {
    try {
      const { jobUrl } = req.body;
      
      if (!jobUrl) {
        return res.status(400).json({ error: "Job URL is required" });
      }

      const jobInfo = await JobParserService.parseJobUrl(jobUrl);
      
      // Get user's current resume
      const user = await storage.getUser(req.user.id);
      let resumeData = {};
      
      if (user?.currentResumeId) {
        const resume = await storage.getResume(user.currentResumeId);
        if (resume?.extractedData) {
          resumeData = resume.extractedData;
        }
      }

      // Create pending application
      const application = await storage.createJobApplication({
        userId: req.user.id,
        resumeId: user?.currentResumeId || '',
        jobUrl,
        jobTitle: jobInfo.title,
        company: jobInfo.company,
        location: jobInfo.location || '',
        platform: jobInfo.platform,
        status: 'pending_review',
        formFields: jobInfo.formFields as Record<string, any>,
        autoFilledData: resumeData,
        manualData: {}
      });

      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        applicationId: application.id,
        action: 'parsed',
        message: `Parsed job posting: ${jobInfo.title} at ${jobInfo.company}`
      });

      res.json({ jobInfo, application });
    } catch (error) {
      console.error("Error parsing job:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to parse job posting" });
    }
  });

  app.get("/api/applications", mockAuth, async (req: any, res) => {
    try {
      const applications = await storage.getJobApplicationsByUserId(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", mockAuth, async (req: any, res) => {
    try {
      const application = await storage.getJobApplication(req.params.id);
      
      if (!application || application.userId !== req.user.id) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  app.put("/api/applications/:id", mockAuth, async (req: any, res) => {
    try {
      const { manualData, status } = req.body;
      
      const application = await storage.getJobApplication(req.params.id);
      
      if (!application || application.userId !== req.user.id) {
        return res.status(404).json({ error: "Application not found" });
      }

      const updatedApplication = await storage.updateJobApplication(req.params.id, {
        manualData,
        status,
        ...(status === 'submitted' && { submittedAt: new Date() })
      });

      // Create activity
      let message = '';
      if (status === 'submitted') {
        message = `Submitted application for ${application.jobTitle} at ${application.company}`;
      } else if (status === 'approved') {
        message = `Approved application for ${application.jobTitle} at ${application.company}`;
      } else {
        message = `Updated application for ${application.jobTitle} at ${application.company}`;
      }

      await storage.createActivity({
        userId: req.user.id,
        applicationId: req.params.id,
        action: status || 'updated',
        message
      });

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  app.delete("/api/applications/:id", mockAuth, async (req: any, res) => {
    try {
      const application = await storage.getJobApplication(req.params.id);
      
      if (!application || application.userId !== req.user.id) {
        return res.status(404).json({ error: "Application not found" });
      }

      await storage.deleteJobApplication(req.params.id);

      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        applicationId: null,
        action: 'deleted',
        message: `Deleted application for ${application.jobTitle} at ${application.company}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ error: "Failed to delete application" });
    }
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", mockAuth, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/activity", mockAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getActivityByUserId(req.user.id, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
