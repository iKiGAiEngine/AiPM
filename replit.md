# Overview

This is a full-stack construction materials procurement application that replicates the core functionality of Field Materials. The system provides AI-driven procurement management for construction projects, including field requisitions linked to awarded contract estimates, vendor management, RFQ processing, purchase order management, delivery tracking, and invoice processing with three-way matching capabilities. The application is designed as a multi-tenant platform supporting organizations with role-based access control.

# User Preferences

Preferred communication style: Simple, everyday language.

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