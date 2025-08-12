import { storage } from '../storage';
import { EmailService } from './email';

const emailService = new EmailService();

export class ThreeWayMatchService {
  async performMatch(invoiceId: string): Promise<any> {
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const organization = await storage.getOrganization(invoice.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const tolerances = organization.settings || {
        priceTolerancePercent: 2,
        qtyTolerancePercent: 1,
        taxFreightCaps: 100
      };

      let matchStatus = 'matched';
      let matchVariance = 0;
      const exceptions: any[] = [];

      // 1. PO Match
      if (!invoice.poId) {
        matchStatus = 'missing_po';
        exceptions.push({
          type: 'missing_po',
          message: 'No associated purchase order found',
          severity: 'high'
        });
      } else {
        const po = await storage.getPurchaseOrder(invoice.poId);
        if (!po) {
          matchStatus = 'missing_po';
          exceptions.push({
            type: 'missing_po',
            message: 'Referenced purchase order not found',
            severity: 'high'
          });
        } else {
          // Price variance check
          const invoiceTotal = parseFloat(invoice.total?.toString() || '0');
          const poTotal = parseFloat(po.total?.toString() || '0');
          const priceDifference = invoiceTotal - poTotal;
          const priceVariancePercent = poTotal > 0 ? Math.abs(priceDifference / poTotal * 100) : 0;

          if (priceVariancePercent > tolerances.priceTolerancePercent) {
            matchStatus = 'price_variance';
            matchVariance = priceDifference;
            exceptions.push({
              type: 'price_variance',
              message: `Invoice total ($${invoiceTotal.toFixed(2)}) differs from PO total ($${poTotal.toFixed(2)}) by ${priceVariancePercent.toFixed(1)}%`,
              severity: priceVariancePercent > 10 ? 'high' : 'medium',
              variance: priceDifference,
              variancePercent: priceVariancePercent
            });
          }

          // Line-by-line matching
          if (invoice.lines && po.lines) {
            const lineMatchResults = await this.matchLineItems(invoice.lines, po.lines, tolerances);
            if (lineMatchResults.exceptions.length > 0) {
              exceptions.push(...lineMatchResults.exceptions);
              if (matchStatus === 'matched') {
                matchStatus = 'qty_variance';
              }
            }
          }

          // Tax and freight checks
          const taxVariance = this.checkTaxVariance(invoice, po, tolerances);
          const freightVariance = this.checkFreightVariance(invoice, po, tolerances);

          if (taxVariance.hasVariance) {
            exceptions.push(taxVariance.exception);
            if (matchStatus === 'matched') matchStatus = 'tax_variance';
          }

          if (freightVariance.hasVariance) {
            exceptions.push(freightVariance.exception);
            if (matchStatus === 'matched') matchStatus = 'freight_variance';
          }
        }
      }

      // 2. Delivery Match (if available)
      const deliveryMatch = await this.checkDeliveryMatch(invoice);
      if (deliveryMatch.exceptions.length > 0) {
        exceptions.push(...deliveryMatch.exceptions);
        if (matchStatus === 'matched') matchStatus = 'delivery_variance';
      }

      // Update invoice with match results
      await this.updateInvoiceMatchStatus(invoiceId, matchStatus, matchVariance, exceptions);

      // Auto-approve if within tolerance
      if (matchStatus === 'matched') {
        await this.autoApproveInvoice(invoiceId);
      } else {
        // Send exception notifications
        await this.notifyExceptions(invoice, exceptions);
      }

      return {
        matchStatus,
        matchVariance,
        exceptions,
        autoApproved: matchStatus === 'matched'
      };

    } catch (error) {
      console.error('3-way match error:', error);
      throw new Error('Failed to perform 3-way match');
    }
  }

  private async matchLineItems(invoiceLines: any[], poLines: any[], tolerances: any): Promise<any> {
    const exceptions: any[] = [];
    
    for (const invoiceLine of invoiceLines) {
      // Find matching PO line by description or SKU
      const matchingPoLine = poLines.find(poLine => 
        poLine.description.toLowerCase().includes(invoiceLine.description.toLowerCase()) ||
        invoiceLine.description.toLowerCase().includes(poLine.description.toLowerCase()) ||
        (poLine.sku && invoiceLine.sku && poLine.sku === invoiceLine.sku)
      );

      if (!matchingPoLine) {
        exceptions.push({
          type: 'unmatched_line',
          message: `Invoice line "${invoiceLine.description}" has no matching PO line`,
          severity: 'medium',
          invoiceLine: invoiceLine
        });
        continue;
      }

      // Quantity variance check
      const invoiceQty = parseFloat(invoiceLine.quantity?.toString() || '0');
      const poQty = parseFloat(matchingPoLine.quantity?.toString() || '0');
      const qtyDifference = invoiceQty - poQty;
      const qtyVariancePercent = poQty > 0 ? Math.abs(qtyDifference / poQty * 100) : 0;

      if (qtyVariancePercent > tolerances.qtyTolerancePercent) {
        exceptions.push({
          type: 'quantity_variance',
          message: `Quantity variance: Invoice (${invoiceQty}) vs PO (${poQty}) - ${qtyVariancePercent.toFixed(1)}% difference`,
          severity: qtyVariancePercent > 20 ? 'high' : 'medium',
          invoiceLine: invoiceLine,
          poLine: matchingPoLine,
          variance: qtyDifference,
          variancePercent: qtyVariancePercent
        });
      }

      // Unit price variance check
      const invoiceUnitPrice = parseFloat(invoiceLine.unitPrice?.toString() || '0');
      const poUnitPrice = parseFloat(matchingPoLine.unitPrice?.toString() || '0');
      const priceDifference = invoiceUnitPrice - poUnitPrice;
      const priceVariancePercent = poUnitPrice > 0 ? Math.abs(priceDifference / poUnitPrice * 100) : 0;

      if (priceVariancePercent > tolerances.priceTolerancePercent) {
        exceptions.push({
          type: 'unit_price_variance',
          message: `Unit price variance: Invoice ($${invoiceUnitPrice.toFixed(2)}) vs PO ($${poUnitPrice.toFixed(2)}) - ${priceVariancePercent.toFixed(1)}% difference`,
          severity: priceVariancePercent > 10 ? 'high' : 'medium',
          invoiceLine: invoiceLine,
          poLine: matchingPoLine,
          variance: priceDifference,
          variancePercent: priceVariancePercent
        });
      }
    }

    return { exceptions };
  }

  private checkTaxVariance(invoice: any, po: any, tolerances: any): any {
    const invoiceTax = parseFloat(invoice.tax?.toString() || '0');
    const poTax = parseFloat(po.tax?.toString() || '0');
    const taxDifference = Math.abs(invoiceTax - poTax);

    if (taxDifference > tolerances.taxFreightCaps) {
      return {
        hasVariance: true,
        exception: {
          type: 'tax_variance',
          message: `Tax variance: Invoice ($${invoiceTax.toFixed(2)}) vs PO ($${poTax.toFixed(2)}) exceeds threshold ($${tolerances.taxFreightCaps})`,
          severity: 'medium',
          variance: invoiceTax - poTax
        }
      };
    }

    return { hasVariance: false };
  }

  private checkFreightVariance(invoice: any, po: any, tolerances: any): any {
    const invoiceFreight = parseFloat(invoice.freight?.toString() || '0');
    const poFreight = parseFloat(po.freight?.toString() || '0');
    const freightDifference = Math.abs(invoiceFreight - poFreight);

    if (freightDifference > tolerances.taxFreightCaps) {
      return {
        hasVariance: true,
        exception: {
          type: 'freight_variance',
          message: `Freight variance: Invoice ($${invoiceFreight.toFixed(2)}) vs PO ($${poFreight.toFixed(2)}) exceeds threshold ($${tolerances.taxFreightCaps})`,
          severity: 'medium',
          variance: invoiceFreight - poFreight
        }
      };
    }

    return { hasVariance: false };
  }

  private async checkDeliveryMatch(invoice: any): Promise<any> {
    const exceptions: any[] = [];

    // Check if there are delivery records for the PO
    if (invoice.poId) {
      const deliveries = await storage.getDeliveriesByOrganization(invoice.organizationId);
      const relatedDeliveries = deliveries.filter((delivery: any) => 
        delivery.po?.id === invoice.poId
      );

      if (relatedDeliveries.length === 0) {
        exceptions.push({
          type: 'missing_delivery',
          message: 'No delivery records found for the associated purchase order',
          severity: 'medium'
        });
      } else {
        // Check if delivered quantities match invoice quantities
        // This is a simplified check - in reality, you'd need more sophisticated matching
        const totalDeliveredValue = relatedDeliveries.reduce((total: number, delivery: any) => {
          return total + (delivery.lines?.reduce((lineTotal: number, line: any) => 
            lineTotal + (parseFloat(line.quantityReceived || 0) * parseFloat(line.unitPrice || 0)), 0) || 0);
        }, 0);

        const invoiceTotal = parseFloat(invoice.total?.toString() || '0');
        const variance = Math.abs(totalDeliveredValue - invoiceTotal);
        const variancePercent = totalDeliveredValue > 0 ? (variance / totalDeliveredValue) * 100 : 0;

        if (variancePercent > 5) { // 5% threshold for delivery matching
          exceptions.push({
            type: 'delivery_invoice_mismatch',
            message: `Delivery value ($${totalDeliveredValue.toFixed(2)}) doesn't match invoice total ($${invoiceTotal.toFixed(2)})`,
            severity: 'medium',
            variance: invoiceTotal - totalDeliveredValue
          });
        }
      }
    }

    return { exceptions };
  }

  private async updateInvoiceMatchStatus(invoiceId: string, matchStatus: string, matchVariance: number, exceptions: any[]): Promise<void> {
    // This would update the invoice in the database
    // For now, we'll log the results
    console.log(`Invoice ${invoiceId} match results:`, {
      matchStatus,
      matchVariance,
      exceptionsCount: exceptions.length
    });
  }

  private async autoApproveInvoice(invoiceId: string): Promise<void> {
    // Auto-approve and mark for export
    console.log(`Auto-approving invoice ${invoiceId}`);
    
    // Update invoice status to approved and set export flag
    // This would involve updating the database record
  }

  private async notifyExceptions(invoice: any, exceptions: any[]): Promise<void> {
    try {
      // Find users who should be notified (AP role typically)
      const memberships = await storage.getUserOrganizations(invoice.organizationId);
      
      // For now, notify the person who uploaded the invoice
      await emailService.sendInvoiceExceptionAlert(invoice.id, invoice.uploadedById);

      // Create in-app notifications
      for (const exception of exceptions) {
        await storage.createNotification({
          organizationId: invoice.organizationId,
          userId: invoice.uploadedById,
          title: 'Invoice Exception',
          message: exception.message,
          type: 'warning',
          entityType: 'invoice',
          entityId: invoice.id
        });
      }
    } catch (error) {
      console.error('Failed to send exception notifications:', error);
    }
  }

  async generateExceptionReport(organizationId: string): Promise<any> {
    const invoices = await storage.getInvoicesByOrganization(organizationId);
    const exceptionInvoices = invoices.filter((invoice: any) => 
      invoice.status === 'exception' || invoice.matchStatus !== 'matched'
    );

    return {
      totalExceptions: exceptionInvoices.length,
      byType: {
        priceVariance: exceptionInvoices.filter((inv: any) => inv.matchStatus === 'price_variance').length,
        quantityVariance: exceptionInvoices.filter((inv: any) => inv.matchStatus === 'qty_variance').length,
        missingPO: exceptionInvoices.filter((inv: any) => inv.matchStatus === 'missing_po').length,
        taxErrors: exceptionInvoices.filter((inv: any) => inv.matchStatus === 'tax_variance').length,
        freightErrors: exceptionInvoices.filter((inv: any) => inv.matchStatus === 'freight_variance').length
      },
      totalValue: exceptionInvoices.reduce((total: number, inv: any) => 
        total + parseFloat(inv.total || 0), 0
      ),
      exceptions: exceptionInvoices
    };
  }
}
