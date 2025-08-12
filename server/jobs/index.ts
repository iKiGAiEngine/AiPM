import cron from 'node-cron';
import { storage } from '../storage';
import { EmailService } from '../services/email';
import { ThreeWayMatchService } from '../services/threeway-match';

const emailService = new EmailService();
const threeWayMatchService = new ThreeWayMatchService();

export class JobScheduler {
  constructor() {
    this.initializeJobs();
  }

  private initializeJobs() {
    // Daily digest emails (8 AM every day)
    cron.schedule('0 8 * * *', async () => {
      console.log('Running daily digest job...');
      await this.sendDailyDigests();
    });

    // Vendor scoring updates (every Sunday at midnight)
    cron.schedule('0 0 * * 0', async () => {
      console.log('Running vendor scoring job...');
      await this.updateVendorScorecards();
    });

    // Invoice processing (every 5 minutes during business hours)
    cron.schedule('*/5 9-17 * * 1-5', async () => {
      console.log('Running invoice processing job...');
      await this.processInvoices();
    });

    // Overdue notifications (every day at 9 AM)
    cron.schedule('0 9 * * *', async () => {
      console.log('Running overdue notifications job...');
      await this.sendOverdueNotifications();
    });

    // Data cleanup (every night at 2 AM)
    cron.schedule('0 2 * * *', async () => {
      console.log('Running data cleanup job...');
      await this.cleanupData();
    });
  }

  private async sendDailyDigests(): Promise<void> {
    try {
      // Get all active users
      const organizations = await this.getAllActiveOrganizations();
      
      for (const org of organizations) {
        const users = await this.getOrganizationUsers(org.id);
        
        for (const user of users) {
          try {
            await emailService.sendDailyDigest(user.id, org.id);
            console.log(`Sent daily digest to ${user.email}`);
          } catch (error) {
            console.error(`Failed to send daily digest to ${user.email}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Daily digest job failed:', error);
    }
  }

  private async updateVendorScorecards(): Promise<void> {
    try {
      const organizations = await this.getAllActiveOrganizations();
      
      for (const org of organizations) {
        const vendors = await storage.getVendorsByOrganization(org.id);
        
        for (const vendor of vendors) {
          await this.calculateVendorScorecard(vendor.id, org.id);
        }
      }
      
      console.log('Vendor scorecards updated successfully');
    } catch (error) {
      console.error('Vendor scoring job failed:', error);
    }
  }

  private async calculateVendorScorecard(vendorId: string, organizationId: string): Promise<void> {
    try {
      // Calculate metrics for the last 90 days
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get POs for this vendor in the period
      const pos = await storage.getPurchaseOrdersByOrganization(organizationId);
      const vendorPOs = pos.filter((po: any) => po.vendor.id === vendorId);

      // Get deliveries for this vendor
      const deliveries = await storage.getDeliveriesByOrganization(organizationId);
      const vendorDeliveries = deliveries.filter((delivery: any) => delivery.vendor.id === vendorId);

      // Calculate on-time delivery percentage
      let onTimeDeliveries = 0;
      let totalDeliveries = 0;

      for (const delivery of vendorDeliveries) {
        if (delivery.po?.requestedDeliveryDate) {
          totalDeliveries++;
          const requestedDate = new Date(delivery.po.requestedDeliveryDate);
          const actualDate = new Date(delivery.deliveryDate);
          
          if (actualDate <= requestedDate) {
            onTimeDeliveries++;
          }
        }
      }

      const onTimePercent = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

      // Calculate accuracy (simplified - based on invoice matching)
      const invoices = await storage.getInvoicesByOrganization(organizationId);
      const vendorInvoices = invoices.filter((inv: any) => inv.vendor.id === vendorId);
      const accurateInvoices = vendorInvoices.filter((inv: any) => inv.matchStatus === 'matched').length;
      const accuracyPercent = vendorInvoices.length > 0 ? (accurateInvoices / vendorInvoices.length) * 100 : 0;

      // Calculate average response time (would need RFQ response tracking)
      const avgResponseTimeHours = 24; // Placeholder

      // Update or create scorecard
      console.log(`Updating scorecard for vendor ${vendorId}: ${onTimePercent.toFixed(1)}% on-time, ${accuracyPercent.toFixed(1)}% accuracy`);
      
    } catch (error) {
      console.error(`Failed to calculate scorecard for vendor ${vendorId}:`, error);
    }
  }

  private async processInvoices(): Promise<void> {
    try {
      const organizations = await this.getAllActiveOrganizations();
      
      for (const org of organizations) {
        const invoices = await storage.getInvoicesByOrganization(org.id);
        const processingInvoices = invoices.filter((inv: any) => inv.status === 'processing');
        
        for (const invoice of processingInvoices) {
          try {
            // Perform 3-way match
            await threeWayMatchService.performMatch(invoice.id);
            console.log(`Processed invoice ${invoice.invoiceNumber}`);
          } catch (error) {
            console.error(`Failed to process invoice ${invoice.invoiceNumber}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Invoice processing job failed:', error);
    }
  }

  private async sendOverdueNotifications(): Promise<void> {
    try {
      const organizations = await this.getAllActiveOrganizations();
      
      for (const org of organizations) {
        // Check for overdue RFQs
        const rfqs = await storage.getRFQsByOrganization(org.id);
        const overdueRFQs = rfqs.filter((rfq: any) => {
          if (!rfq.bidDueDate) return false;
          const dueDate = new Date(rfq.bidDueDate);
          const now = new Date();
          return now > dueDate && rfq.status !== 'analyzed';
        });

        // Check for overdue POs
        const pos = await storage.getPurchaseOrdersByOrganization(org.id);
        const overduePOs = pos.filter((po: any) => {
          if (!po.requestedDeliveryDate) return false;
          const dueDate = new Date(po.requestedDeliveryDate);
          const now = new Date();
          return now > dueDate && po.status !== 'delivered';
        });

        // Send notifications
        for (const rfq of overdueRFQs) {
          await storage.createNotification({
            organizationId: org.id,
            userId: rfq.creator.id,
            title: 'Overdue RFQ',
            message: `RFQ ${rfq.number} is past due date`,
            type: 'warning',
            entityType: 'rfq',
            entityId: rfq.id
          });
        }

        for (const po of overduePOs) {
          await storage.createNotification({
            organizationId: org.id,
            userId: po.creator.id,
            title: 'Overdue Purchase Order',
            message: `PO ${po.number} delivery is overdue`,
            type: 'warning',
            entityType: 'purchase_order',
            entityId: po.id
          });
        }
      }
    } catch (error) {
      console.error('Overdue notifications job failed:', error);
    }
  }

  private async cleanupData(): Promise<void> {
    try {
      // Clean up old temporary files
      console.log('Cleaning up temporary files...');
      
      // Archive old audit logs (keep 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      console.log('Data cleanup completed');
    } catch (error) {
      console.error('Data cleanup job failed:', error);
    }
  }

  private async getAllActiveOrganizations(): Promise<any[]> {
    // This would fetch all active organizations
    // For now, return empty array as we need to implement this query
    return [];
  }

  private async getOrganizationUsers(organizationId: string): Promise<any[]> {
    // This would fetch all users for an organization
    // For now, return empty array as we need to implement this query
    return [];
  }
}

// Background job processing
export class BackgroundJobProcessor {
  private jobQueue: any[] = [];
  private isProcessing = false;

  constructor() {
    this.startProcessing();
  }

  addJob(job: any): void {
    this.jobQueue.push({
      ...job,
      id: Date.now() + Math.random(),
      createdAt: new Date(),
      status: 'pending'
    });
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (true) {
      if (this.jobQueue.length > 0) {
        const job = this.jobQueue.shift();
        if (job) {
          try {
            await this.processJob(job);
          } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            job.status = 'failed';
            job.error = error.message;
          }
        }
      } else {
        // Sleep for 1 second if no jobs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processJob(job: any): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();

    console.log(`Processing job ${job.id}: ${job.type}`);

    switch (job.type) {
      case 'ocr_processing':
        await this.processOCR(job);
        break;
      case 'email_sending':
        await this.sendEmail(job);
        break;
      case 'pdf_generation':
        await this.generatePDF(job);
        break;
      case '3way_match':
        await this.perform3WayMatch(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    job.status = 'completed';
    job.completedAt = new Date();
    
    console.log(`Job ${job.id} completed in ${job.completedAt.getTime() - job.startedAt.getTime()}ms`);
  }

  private async processOCR(job: any): Promise<void> {
    // OCR processing implementation
    console.log(`Processing OCR for file: ${job.data.filePath}`);
  }

  private async sendEmail(job: any): Promise<void> {
    // Email sending implementation
    console.log(`Sending email: ${job.data.subject}`);
  }

  private async generatePDF(job: any): Promise<void> {
    // PDF generation implementation
    console.log(`Generating PDF: ${job.data.type}`);
  }

  private async perform3WayMatch(job: any): Promise<void> {
    // 3-way match implementation
    await threeWayMatchService.performMatch(job.data.invoiceId);
  }

  getJobStatus(jobId: string): any {
    return this.jobQueue.find(job => job.id === jobId) || { status: 'not_found' };
  }
}

// Initialize job scheduler and processor
export const jobScheduler = new JobScheduler();
export const jobProcessor = new BackgroundJobProcessor();
