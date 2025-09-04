import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { purchaseOrders, vendors, users } from '../../shared/schema';
import { emailService } from './email';

// Enhanced PO Status Workflow System
export const PO_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PENDING_SHIPMENT: 'pending_shipment',
  PENDING_DELIVERY: 'pending_delivery', 
  DELIVERED: 'delivered',
  MATCHED_PENDING_PAYMENT: 'matched_pending_payment',
  RECEIVED_NBS_WH: 'received_nbs_wh'
} as const;

export type POStatus = typeof PO_STATUSES[keyof typeof PO_STATUSES];

export interface POStatusUpdate {
  poId: string;
  fromStatus?: POStatus;
  toStatus: POStatus;
  userId?: string;
  reason?: string;
  metadata?: {
    trackingNumber?: string;
    carrierName?: string;
    estimatedShipmentDate?: Date;
    deliveryLocation?: string;
    invoiceId?: string;
    damageReportRequired?: boolean;
    [key: string]: any;
  };
}

export interface VendorAcknowledgment {
  poId: string;
  vendorId: string;
  acknowledgedById?: string;
  estimatedShipmentDate?: Date;
  notes?: string;
}

export interface DeliveryNotification {
  poId: string;
  deliveredAt: Date;
  receiverId: string;
  deliveryLocation?: string;
  damageNoted?: boolean;
  notes?: string;
}

class POWorkflowService {
  // Update PO status with full audit trail and automation
  async updatePOStatus(update: POStatusUpdate): Promise<void> {
    const { poId, fromStatus, toStatus, userId, reason, metadata } = update;
    
    try {
      // Get current PO details
      const [po] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, poId));
      
      if (!po) {
        throw new Error(`Purchase order ${poId} not found`);
      }

      // Prepare update data based on new status
      const updateData: any = {
        status: toStatus,
        updatedAt: new Date()
      };

      // Status-specific updates
      switch (toStatus) {
        case PO_STATUSES.SENT:
          updateData.sentAt = new Date();
          break;
          
        case PO_STATUSES.PENDING_SHIPMENT:
          if (metadata?.estimatedShipmentDate) {
            updateData.estimatedShipmentDate = metadata.estimatedShipmentDate;
          }
          updateData.acknowledgedAt = new Date();
          break;
          
        case PO_STATUSES.PENDING_DELIVERY:
          if (metadata?.trackingNumber) {
            updateData.trackingNumber = metadata.trackingNumber;
          }
          if (metadata?.carrierName) {
            updateData.carrierName = metadata.carrierName;
          }
          break;
          
        case PO_STATUSES.DELIVERED:
          updateData.deliveredAt = new Date();
          // Set 48-hour damage report deadline
          updateData.damageReportDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
          updateData.damageReportSent = false;
          break;
          
        case PO_STATUSES.MATCHED_PENDING_PAYMENT:
          if (metadata?.invoiceId) {
            updateData.invoiceId = metadata.invoiceId;
            updateData.invoiceMatchedAt = new Date();
          }
          break;
          
        case PO_STATUSES.RECEIVED_NBS_WH:
          updateData.nbsWarehouseReceivedAt = new Date();
          break;
      }

      // Update status history
      const currentHistory = (po.statusHistory as any[]) || [];
      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        fromStatus,
        toStatus,
        userId,
        reason,
        metadata
      };
      updateData.statusHistory = [...currentHistory, newHistoryEntry];

      // Update the purchase order
      await db.update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, poId));

      // Trigger automated actions based on status
      await this.triggerStatusAutomation(poId, toStatus, metadata);
      
      console.log(`PO ${po.number} status updated from ${fromStatus} to ${toStatus}`);
      
    } catch (error) {
      console.error('Failed to update PO status:', error);
      throw error;
    }
  }

  // Vendor acknowledgment workflow
  async recordVendorAcknowledgment(ack: VendorAcknowledgment): Promise<void> {
    try {
      // Update PO to pending_shipment status
      await this.updatePOStatus({
        poId: ack.poId,
        toStatus: PO_STATUSES.PENDING_SHIPMENT,
        userId: ack.acknowledgedById,
        reason: 'Vendor acknowledgment received',
        metadata: {
          estimatedShipmentDate: ack.estimatedShipmentDate,
          vendorNotes: ack.notes
        }
      });

      console.log(`Vendor acknowledgment recorded for PO ${ack.poId}`);
      
    } catch (error) {
      console.error('Failed to record vendor acknowledgment:', error);
      throw error;
    }
  }

  // Record delivery and trigger damage report email
  async recordDelivery(delivery: DeliveryNotification): Promise<void> {
    try {
      await this.updatePOStatus({
        poId: delivery.poId,
        toStatus: PO_STATUSES.DELIVERED,
        userId: delivery.receiverId,
        reason: 'Delivery confirmed',
        metadata: {
          deliveryLocation: delivery.deliveryLocation,
          damageNoted: delivery.damageNoted,
          deliveryNotes: delivery.notes
        }
      });

      // Schedule damage report email
      await this.scheduleDamageReportEmail(delivery.poId);
      
      console.log(`Delivery recorded for PO ${delivery.poId}`);
      
    } catch (error) {
      console.error('Failed to record delivery:', error);
      throw error;
    }
  }

  // Update tracking information
  async updateTrackingInfo(poId: string, trackingNumber: string, carrierName?: string): Promise<void> {
    try {
      await this.updatePOStatus({
        poId,
        toStatus: PO_STATUSES.PENDING_DELIVERY,
        reason: 'Tracking information updated',
        metadata: {
          trackingNumber,
          carrierName
        }
      });

      console.log(`Tracking updated for PO ${poId}: ${trackingNumber}`);
      
    } catch (error) {
      console.error('Failed to update tracking info:', error);
      throw error;
    }
  }

  // Process invoice matching
  async processInvoiceMatching(poId: string, invoiceId: string, userId?: string): Promise<void> {
    try {
      await this.updatePOStatus({
        poId,
        toStatus: PO_STATUSES.MATCHED_PENDING_PAYMENT,
        userId,
        reason: 'Invoice matched successfully',
        metadata: {
          invoiceId
        }
      });

      console.log(`Invoice matching completed for PO ${poId}`);
      
    } catch (error) {
      console.error('Failed to process invoice matching:', error);
      throw error;
    }
  }

  // Transfer to NBS warehouse
  async transferToNBSWarehouse(poId: string, receiverId: string, location?: string): Promise<void> {
    try {
      await this.updatePOStatus({
        poId,
        toStatus: PO_STATUSES.RECEIVED_NBS_WH,
        userId: receiverId,
        reason: 'Materials received in NBS warehouse',
        metadata: {
          warehouseLocation: location
        }
      });

      console.log(`PO ${poId} materials received in NBS warehouse`);
      
    } catch (error) {
      console.error('Failed to transfer to NBS warehouse:', error);
      throw error;
    }
  }

  // Get PO status history
  async getPOStatusHistory(poId: string): Promise<any[]> {
    try {
      const [po] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, poId));
      
      return (po?.statusHistory as any[]) || [];
      
    } catch (error) {
      console.error('Failed to get PO status history:', error);
      return [];
    }
  }

  // Automated actions based on status changes
  private async triggerStatusAutomation(poId: string, status: POStatus, metadata?: any): Promise<void> {
    switch (status) {
      case PO_STATUSES.SENT:
        // Notify vendor of new PO
        await this.notifyVendorOfNewPO(poId);
        break;
        
      case PO_STATUSES.DELIVERED:
        // Schedule damage report email for 48 hours
        await this.scheduleDamageReportEmail(poId);
        break;
        
      case PO_STATUSES.MATCHED_PENDING_PAYMENT:
        // Notify AP team
        await this.notifyAPTeam(poId);
        break;
    }
  }

  // Email notifications
  private async notifyVendorOfNewPO(poId: string): Promise<void> {
    try {
      // Get PO and vendor details
      const [result] = await db.select({
        po: purchaseOrders,
        vendor: vendors
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, poId));

      if (result?.vendor?.email) {
        await emailService.sendEmail(result.vendor.email, {
          subject: `New Purchase Order: ${result.po.number}`,
          html: `
            <h2>New Purchase Order Received</h2>
            <p>Dear ${result.vendor.name},</p>
            <p>You have received a new purchase order: <strong>${result.po.number}</strong></p>
            <p>Please review and acknowledge receipt within 24 hours.</p>
            <p>Total Amount: $${result.po.totalAmount}</p>
            <p>Thank you!</p>
          `,
          text: `New Purchase Order: ${result.po.number}\n\nDear ${result.vendor.name},\n\nYou have received a new purchase order: ${result.po.number}\nPlease review and acknowledge receipt within 24 hours.\nTotal Amount: $${result.po.totalAmount}\n\nThank you!`
        });
      }
      
    } catch (error) {
      console.error('Failed to notify vendor:', error);
    }
  }

  private async scheduleDamageReportEmail(poId: string): Promise<void> {
    // Schedule for 48 hours after delivery
    setTimeout(async () => {
      try {
        const [po] = await db.select()
          .from(purchaseOrders)
          .where(and(
            eq(purchaseOrders.id, poId),
            eq(purchaseOrders.damageReportSent, false)
          ));

        if (po) {
          await this.sendDamageReportEmail(poId);
        }
      } catch (error) {
        console.error('Failed to send damage report email:', error);
      }
    }, 48 * 60 * 60 * 1000); // 48 hours
  }

  private async sendDamageReportEmail(poId: string): Promise<void> {
    try {
      // Get PO details and project contacts
      const [result] = await db.select({
        po: purchaseOrders,
        vendor: vendors
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, poId));

      if (result?.vendor?.email) {
        await emailService.sendEmail(result.vendor.email, {
          subject: `Damage Report Required: PO ${result.po.number}`,
          html: `
            <h2>48-Hour Damage Report Notice</h2>
            <p>Dear ${result.vendor.name},</p>
            <p>This is a reminder that materials from PO ${result.po.number} were delivered 48 hours ago.</p>
            <p>If no damage reports have been filed, this delivery will be considered accepted in good condition.</p>
            <p>Please contact us immediately if there are any issues.</p>
            <p>Thank you!</p>
          `,
          text: `Damage Report Required: PO ${result.po.number}\n\nDear ${result.vendor.name},\n\nThis is a reminder that materials from PO ${result.po.number} were delivered 48 hours ago.\n\nIf no damage reports have been filed, this delivery will be considered accepted in good condition.\n\nPlease contact us immediately if there are any issues.\n\nThank you!`
        });

        // Mark damage report as sent
        await db.update(purchaseOrders)
          .set({ damageReportSent: true })
          .where(eq(purchaseOrders.id, poId));
      }
      
    } catch (error) {
      console.error('Failed to send damage report email:', error);
    }
  }

  private async notifyAPTeam(poId: string): Promise<void> {
    try {
      // Get AP team members and notify of matched invoice
      const [po] = await db.select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, poId));

      // Implementation would fetch AP team members and send notification
      console.log(`AP team notified of matched invoice for PO ${po.number}`);
      
    } catch (error) {
      console.error('Failed to notify AP team:', error);
    }
  }
}

export const poWorkflowService = new POWorkflowService();