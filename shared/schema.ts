import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  currentResumeId: varchar("current_resume_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  objectPath: text("object_path").notNull(),
  extractedText: text("extracted_text"),
  extractedData: jsonb("extracted_data").$type<{
    fullName?: string;
    email?: string;
    phone?: string;
    experience?: string;
    skills?: string[];
    education?: string;
  }>(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  resumeId: varchar("resume_id").notNull().references(() => resumes.id),
  jobUrl: text("job_url").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  platform: text("platform").notNull(), // lever, greenhouse, workday, etc.
  status: text("status").notNull().default("parsing"), // parsing, pending_review, approved, submitted, failed
  formFields: jsonb("form_fields").$type<Record<string, any>>(),
  autoFilledData: jsonb("auto_filled_data").$type<Record<string, any>>(),
  manualData: jsonb("manual_data").$type<Record<string, any>>(),
  errorMessage: text("error_message"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const applicationActivity = pgTable("application_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationId: varchar("application_id").references(() => jobApplications.id),
  action: text("action").notNull(), // parsed, reviewed, submitted, failed, etc.
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationActivitySchema = createInsertSchema(applicationActivity).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

export type InsertApplicationActivity = z.infer<typeof insertApplicationActivitySchema>;
export type ApplicationActivity = typeof applicationActivity.$inferSelect;
