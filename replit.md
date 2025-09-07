# Overview

JobFlow is an automated job application management system that streamlines the job application process. The application allows users to upload resumes, parse job postings from various platforms (Lever, Greenhouse, Workday), and automatically fill out application forms. It features a React frontend with a dashboard for tracking application status, managing resumes, and monitoring application activity, paired with an Express.js backend that handles PDF parsing, job site scraping, and data management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built with React and TypeScript, using Vite as the build tool and bundler. The UI framework leverages shadcn/ui components built on top of Radix UI primitives for consistent, accessible design patterns. TailwindCSS provides utility-first styling with a comprehensive design system including CSS variables for theming.

**Key Design Decisions:**
- **Component Library Choice**: shadcn/ui was chosen for its high-quality, customizable components that maintain accessibility standards while providing flexibility
- **State Management**: TanStack Query (React Query) handles server state management, providing caching, synchronization, and optimistic updates
- **Routing**: Wouter provides lightweight client-side routing with a simple API
- **Form Handling**: React Hook Form with Zod validation ensures type-safe form management

## Backend Architecture

The server uses Express.js with TypeScript in ESM mode, providing a RESTful API architecture. The system follows a service-oriented design with clear separation of concerns between routing, business logic, and data access.

**Core Services:**
- **PDF Parser Service**: Extracts text and structured data from resume PDFs using pdf-parse
- **Job Parser Service**: Scrapes and parses job postings from different platforms using Cheerio for HTML parsing
- **Storage Service**: Abstracted data access layer supporting both in-memory storage (for development) and database operations

**API Design**: RESTful endpoints following conventional HTTP methods and status codes, with comprehensive error handling and request/response logging middleware.

## Data Storage Solutions

The application uses a flexible storage architecture with Drizzle ORM providing type-safe database operations. The schema defines users, resumes, job applications, and activity tracking with proper relationships and constraints.

**Database Strategy:**
- **PostgreSQL**: Primary database using Neon serverless for production scalability
- **Schema Management**: Drizzle Kit handles migrations and schema evolution
- **Type Safety**: Full TypeScript integration from database to frontend using shared schema definitions

## Authentication and Authorization

The system implements a mock authentication layer for development purposes, with infrastructure prepared for production authentication. Session management uses express-session with PostgreSQL storage via connect-pg-simple.

## External Service Integrations

**Object Storage**: Integration with Google Cloud Storage through Replit's sidecar endpoint for secure file uploads and management. The system includes comprehensive ACL (Access Control List) policies for fine-grained permission management.

**File Upload Pipeline**: Multer handles multipart form data with file type validation, while Uppy provides the frontend upload interface with progress tracking and error handling.

**Job Platform Integration**: The job parser service supports multiple platforms:
- Lever job boards
- Greenhouse application systems  
- Workday career sites
- Generic job posting parsing as fallback

**Development Tools**: 
- Replit integration for development environment
- Vite HMR for fast development feedback
- Runtime error overlay for debugging