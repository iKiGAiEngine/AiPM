# Overview

This is AiPM - An AI Project Manager for construction materials procurement. The system provides AI-driven procurement management for construction projects, including field requisitions linked to awarded contract estimates, vendor management, RFQ processing, purchase order management, delivery tracking, and invoice processing with three-way matching capabilities. The application is designed as a multi-tenant platform supporting organizations with role-based access control.

## Recent Updates (August 13, 2025)
- **Enhanced PO Creation Workflow**: Implemented advanced purchase order creation with project material integration
- **Material Type/Scope Filtering**: Added filtering by Material Type and Scope of Work for uploaded project materials
- **Bulk Material Selection**: Users can now select multiple materials with checkboxes and add them to POs in bulk
- **Project-to-PO Integration**: Complete workflow from Excel material upload → project materials → filtered selection → PO creation
- **Enhanced UI/UX**: Improved purchase order form with better material browsing and selection capabilities

## Previous Updates (August 12, 2025)
- **Excel Import Integration**: Successfully integrated comprehensive Excel import functionality into the Project Creation wizard
- **Multi-Step Project Creation**: Enhanced project creation workflow with three distinct steps:
  1. Project Information (basic details and contract info)
  2. Budget & Cost Codes (cost code configuration and budget allocation)
  3. Materials Import (Excel upload with validation and cost code mapping)
- **Material Import Service**: Implemented complete material import pipeline with validation, error handling, and batch processing
- **Database Schema**: Extended schema with material_import_runs and material_import_lines tables using jsonb and uuid types
- **API Integration**: Added material import routes with proper authentication and file upload handling

# User Preferences

Preferred communication style: Simple, everyday language.
Business Name: AiPM (AI Project Manager for Construction) - Updated from BuildProcure AI on August 13, 2025.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and bundling
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod schema validation
- **PWA Support**: Configured for offline capabilities and mobile installation
- **Mobile-First Design**: Responsive design with sidebar navigation and global search (CMD/Ctrl+K)

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses
- **Authentication**: JWT-based auth with access/refresh tokens and role-based access control (Admin, PM, Purchaser, Field, AP)
- **File Processing**: OCR capabilities using Tesseract.js for invoice/document processing
- **PDF Generation**: PDFKit for generating purchase orders and reports
- **Background Jobs**: Scheduled tasks using node-cron for vendor scoring, email digests, and invoice processing

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database interactions
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless PostgreSQL for production scalability
- **Multi-tenancy**: Organization-based data isolation with shared schema approach
- **Contract Integration**: Contract estimates table links requisitions to awarded GC estimates for accurate budget tracking

## External Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: JWT tokens stored in localStorage with automatic refresh
- **Email Service**: Configured for RFQ notifications and system alerts
- **OCR Processing**: Tesseract.js for document text extraction
- **File Storage**: Local file handling with plans for cloud storage integration
- **Development Tools**: Vite development server with hot module replacement
- **CSS Framework**: Tailwind CSS with custom design system variables
- **Icon Library**: Lucide React for consistent iconography
- **Charts**: Recharts for dashboard analytics and reporting
- **Date Handling**: date-fns for date formatting and manipulation