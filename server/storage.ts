import { 
  type User, 
  type InsertUser,
  type Resume,
  type InsertResume,
  type JobApplication,
  type InsertJobApplication,
  type ApplicationActivity,
  type InsertApplicationActivity
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Resumes
  getResume(id: string): Promise<Resume | undefined>;
  getResumesByUserId(userId: string): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: string, updates: Partial<Resume>): Promise<Resume | undefined>;
  deleteResume(id: string): Promise<boolean>;

  // Job Applications
  getJobApplication(id: string): Promise<JobApplication | undefined>;
  getJobApplicationsByUserId(userId: string): Promise<JobApplication[]>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined>;
  deleteJobApplication(id: string): Promise<boolean>;

  // Application Activity
  getActivityByUserId(userId: string, limit?: number): Promise<ApplicationActivity[]>;
  createActivity(activity: InsertApplicationActivity): Promise<ApplicationActivity>;

  // Stats
  getUserStats(userId: string): Promise<{
    totalApplications: number;
    pendingReview: number;
    successRate: number;
    timeSaved: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private resumes: Map<string, Resume>;
  private jobApplications: Map<string, JobApplication>;
  private applicationActivity: Map<string, ApplicationActivity>;

  constructor() {
    this.users = new Map();
    this.resumes = new Map();
    this.jobApplications = new Map();
    this.applicationActivity = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser, specifiedId?: string): Promise<User> {
    const id = specifiedId || randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      phone: insertUser.phone ?? null,
      currentResumeId: insertUser.currentResumeId ?? null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Resumes
  async getResume(id: string): Promise<Resume | undefined> {
    return this.resumes.get(id);
  }

  async getResumesByUserId(userId: string): Promise<Resume[]> {
    return Array.from(this.resumes.values()).filter(
      (resume) => resume.userId === userId
    );
  }

  async createResume(insertResume: InsertResume): Promise<Resume> {
    const id = randomUUID();
    const resume: Resume = {
      ...insertResume,
      id,
      extractedText: insertResume.extractedText ?? null,
      extractedData: insertResume.extractedData ?? null,
      createdAt: new Date(),
    };
    this.resumes.set(id, resume);
    return resume;
  }

  async updateResume(id: string, updates: Partial<Resume>): Promise<Resume | undefined> {
    const resume = this.resumes.get(id);
    if (!resume) return undefined;
    
    const updatedResume = { ...resume, ...updates };
    this.resumes.set(id, updatedResume);
    return updatedResume;
  }

  async deleteResume(id: string): Promise<boolean> {
    return this.resumes.delete(id);
  }

  // Job Applications
  async getJobApplication(id: string): Promise<JobApplication | undefined> {
    return this.jobApplications.get(id);
  }

  async getJobApplicationsByUserId(userId: string): Promise<JobApplication[]> {
    return Array.from(this.jobApplications.values())
      .filter((app) => app.userId === userId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createJobApplication(insertApplication: InsertJobApplication): Promise<JobApplication> {
    const id = randomUUID();
    const application: JobApplication = {
      ...insertApplication,
      id,
      status: insertApplication.status ?? 'parsing',
      location: insertApplication.location ?? null,
      formFields: insertApplication.formFields ?? null,
      autoFilledData: insertApplication.autoFilledData ?? null,
      manualData: insertApplication.manualData ?? null,
      errorMessage: insertApplication.errorMessage ?? null,
      submittedAt: insertApplication.submittedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobApplications.set(id, application);
    return application;
  }

  async updateJobApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined> {
    const application = this.jobApplications.get(id);
    if (!application) return undefined;
    
    const updatedApplication = { 
      ...application, 
      ...updates,
      updatedAt: new Date(),
    };
    this.jobApplications.set(id, updatedApplication);
    return updatedApplication;
  }

  async deleteJobApplication(id: string): Promise<boolean> {
    return this.jobApplications.delete(id);
  }

  // Application Activity
  async getActivityByUserId(userId: string, limit: number = 10): Promise<ApplicationActivity[]> {
    return Array.from(this.applicationActivity.values())
      .filter((activity) => activity.userId === userId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  async createActivity(insertActivity: InsertApplicationActivity): Promise<ApplicationActivity> {
    const id = randomUUID();
    const activity: ApplicationActivity = {
      ...insertActivity,
      id,
      applicationId: insertActivity.applicationId ?? null,
      createdAt: new Date(),
    };
    this.applicationActivity.set(id, activity);
    return activity;
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    totalApplications: number;
    pendingReview: number;
    successRate: number;
    timeSaved: number;
  }> {
    const applications = await this.getJobApplicationsByUserId(userId);
    const totalApplications = applications.length;
    const pendingReview = applications.filter(app => app.status === 'pending_review').length;
    const submitted = applications.filter(app => app.status === 'submitted').length;
    const successRate = totalApplications > 0 ? Math.round((submitted / totalApplications) * 100) : 0;
    const timeSaved = Math.round(totalApplications * 0.75); // Assume 45 minutes saved per application

    return {
      totalApplications,
      pendingReview,
      successRate,
      timeSaved,
    };
  }
}

export const storage = new MemStorage();
