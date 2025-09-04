export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface RFQEmailData {
  projectName: string;
  scopeOfWork: string;
  vendorName: string;
  contactFirst: string;
  bidDueDate: string;
  shipToLine: string;
  requesterName: string;
  requesterTitle: string;
  orgSignatureBlock: string;
  secureRfqLink: string;
  lineItems: Array<{
    description: string;
    model: string;
    quantity: number;
  }>;
}

class EmailService {
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }

  generateRFQEmail(data: RFQEmailData): EmailTemplate {
    const timeOfDay = this.getTimeOfDay();
    const shipTo = data.shipToLine || "Direct to Site – Please see plans for jobsite address.";

    const subject = `${data.projectName} – ${data.scopeOfWork} – ${data.vendorName}`;

    // Generate HTML table for line items
    const htmlTable = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <thead style="background-color: #f3f4f6;">
          <tr>
            <th style="text-align: left;">Description</th>
            <th style="text-align: left;">Model</th>
            <th style="text-align: center;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${data.lineItems.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.model}</td>
              <td style="text-align: center;">${item.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RFQ: ${data.projectName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Request for Quote</h2>
          
          <p>Good ${timeOfDay} ${data.contactFirst},</p>
          
          <p>We're requesting material pricing for the project below. Please submit by <strong>${data.bidDueDate}</strong>.</p>
          
          <div style="background: white; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Scope of Work:</strong> ${data.scopeOfWork}</p>
            <p><strong>Ship To:</strong> ${shipTo}</p>
            <p><strong>Due Date:</strong> ${data.bidDueDate}</p>
          </div>
          
          <p><strong>Material Pricing Needed For:</strong></p>
          ${htmlTable}
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Notes:</strong></p>
            <ul style="margin: 8px 0;">
              <li>Please include unit pricing, freight estimate, lead time, and substitutions if applicable.</li>
              <li>Reply to this email with your quote PDF, or use the secure link below.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.secureRfqLink}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Vendor Portal
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p>Regards,<br>
            <strong>${data.requesterName}</strong><br>
            ${data.requesterTitle}<br>
            ${data.orgSignatureBlock}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Good ${timeOfDay} ${data.contactFirst},

We're requesting material pricing for the project below. Please submit by ${data.bidDueDate}.

Scope of Work: ${data.scopeOfWork}
Ship To: ${shipTo}
Due Date: ${data.bidDueDate}

Material Pricing Needed For:
${data.lineItems.map(item => `- ${item.description} (${item.model}) - Qty: ${item.quantity}`).join('\n')}

Notes:
- Please include unit pricing, freight estimate, lead time, and substitutions if applicable.
- Reply to this email with your quote PDF, or use the secure link below.

Vendor Portal: ${data.secureRfqLink}

Regards,
${data.requesterName}
${data.requesterTitle}
${data.orgSignatureBlock}
    `;

    return { subject, html, text };
  }

  generatePOEmail(poData: any): EmailTemplate {
    const subject = `Purchase Order ${poData.number} - ${poData.projectName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Purchase Order ${poData.number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Purchase Order ${poData.number}</h2>
        <p>Dear ${poData.vendorName},</p>
        <p>Please find attached Purchase Order ${poData.number} for ${poData.projectName}.</p>
        <p>Please acknowledge receipt and provide estimated delivery dates.</p>
        <p>Thank you for your business.</p>
      </body>
      </html>
    `;

    const text = `
Purchase Order ${poData.number}

Dear ${poData.vendorName},

Please find attached Purchase Order ${poData.number} for ${poData.projectName}.

Please acknowledge receipt and provide estimated delivery dates.

Thank you for your business.
    `;

    return { subject, html, text };
  }

  async sendEmail(to: string, template: EmailTemplate, attachments?: Array<{ filename: string; path: string }>): Promise<boolean> {
    try {
      // Use SendGrid if available, otherwise simulate
      if (process.env.SENDGRID_API_KEY) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const msg = {
          to: to,
          from: 'noreply@fieldmaterials.com',
          subject: template.subject,
          text: template.text,
          html: template.html,
          attachments: attachments?.map(att => ({
            filename: att.filename,
            content: require('fs').readFileSync(att.path).toString('base64'),
            type: 'application/pdf',
            disposition: 'attachment'
          }))
        };

        await sgMail.send(msg);
        console.log(`Email sent successfully to ${to} via SendGrid`);
        return true;
      } else {
        // Fallback simulation
        console.log(`Sending email to: ${to}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Attachments: ${attachments?.length || 0}`);
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
      }
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }

  async sendRFQToVendors(rfqData: RFQEmailData, vendorEmails: string[]): Promise<{ sent: number; failed: number }> {
    const template = this.generateRFQEmail(rfqData);
    let sent = 0;
    let failed = 0;

    for (const email of vendorEmails) {
      try {
        const success = await this.sendEmail(email, template);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendPOToVendor(poData: any, vendorEmail: string, pdfPath?: string): Promise<boolean> {
    const template = this.generatePOEmail(poData);
    const attachments = pdfPath ? [{ filename: `PO-${poData.number}.pdf`, path: pdfPath }] : undefined;
    
    return await this.sendEmail(vendorEmail, template, attachments);
  }

  async sendNotificationEmail(userEmail: string, notification: { title: string; message: string }): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `BuildProcure AI: ${notification.title}`,
      html: `
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:5000'}">View in BuildProcure AI</a></p>
      `,
      text: `${notification.title}\n\n${notification.message}\n\nView in BuildProcure AI: ${process.env.APP_URL || 'http://localhost:5000'}`
    };

    return await this.sendEmail(userEmail, template);
  }

  async sendDamageReportNotification(po: any, damageReportDeadline: Date): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Damage Report Window Open - PO ${po.number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin-top: 0;">⚠️ Damage Report Window Now Open</h2>
          </div>
          
          <h3>Purchase Order ${po.number} Has Been Delivered</h3>
          
          <p>Materials from PO ${po.number} have been successfully delivered to the project site.</p>
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="margin-top: 0; color: #374151;">48-Hour Damage Report Period</h4>
            <p style="margin-bottom: 8px;"><strong>Report Deadline:</strong> ${damageReportDeadline.toLocaleString()}</p>
            <p style="margin-bottom: 0;">You have <strong>48 hours</strong> from delivery to report any damaged or missing materials.</p>
          </div>
          
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h4 style="margin-top: 0; color: #dc2626;">Important Notice</h4>
            <p style="margin-bottom: 0;">If no damage report is filed within 48 hours, materials will be considered accepted in good condition. After this period, damage claims cannot be processed.</p>
          </div>
          
          <p>If you notice any damaged or missing materials, please contact our procurement team immediately.</p>
          
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              This is an automated notification from BuildProcure AI.<br>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}">Login to view purchase order details</a>
            </p>
          </div>
        </div>
      `,
      text: `
DAMAGE REPORT WINDOW NOW OPEN

Purchase Order ${po.number} Has Been Delivered

Materials from PO ${po.number} have been successfully delivered to the project site.

48-HOUR DAMAGE REPORT PERIOD
Report Deadline: ${damageReportDeadline.toLocaleString()}

You have 48 hours from delivery to report any damaged or missing materials.

IMPORTANT NOTICE: If no damage report is filed within 48 hours, materials will be considered accepted in good condition. After this period, damage claims cannot be processed.

If you notice any damaged or missing materials, please contact our procurement team immediately.

BuildProcure AI
${process.env.APP_URL || 'http://localhost:5000'}
      `
    };

    // Send to project manager and organization admin
    // For now, we'll send to a default email - this should be configurable per organization
    const recipientEmail = process.env.DAMAGE_REPORT_EMAIL || 'procurement@example.com';
    
    return await this.sendEmail(recipientEmail, template);
  }
}

export const emailService = new EmailService();
