import { storage } from "../storage";
import type { Invoice, PurchaseOrder, Delivery } from "@shared/schema";

export interface MatchResult {
  matched: boolean;
  exceptions: Array<{
    type: 'price' | 'quantity' | 'tax' | 'freight' | 'missing_po' | 'missing_delivery';
    severity: 'warning' | 'error';
    message: string;
    variance?: number;
    tolerance?: number;
  }>;
  summary: {
    poMatch: boolean;
    deliveryMatch: boolean;
    priceVariance: number;
    quantityVariance: number;
    totalVariance: number;
  };
}

class ThreeWayMatchService {
  private readonly DEFAULT_TOLERANCES = {
    pricePercentage: 2.0, // 2%
    quantityPercentage: 1.0, // 1%
    taxFreightCap: 50.0 // $50 absolute
  };

  async performMatch(invoice: Invoice): Promise<MatchResult> {
    const exceptions: MatchResult['exceptions'] = [];
    let matched = true;

    // Get related PO and delivery
    const po = invoice.poId ? await storage.getPurchaseOrder(invoice.poId) : null;
    const delivery = invoice.deliveryId ? await storage.getDelivery(invoice.deliveryId) : null;

    if (!po) {
      exceptions.push({
        type: 'missing_po',
        severity: 'error',
        message: 'No matching purchase order found'
      });
      matched = false;
    }

    // Calculate variances
    let priceVariance = 0;
    let quantityVariance = 0;
    let totalVariance = 0;

    if (po && invoice.totalAmount) {
      totalVariance = Number(invoice.totalAmount) - Number(po.totalAmount || 0);
      const variancePercentage = Math.abs(totalVariance) / Number(po.totalAmount || 1) * 100;

      if (variancePercentage > this.DEFAULT_TOLERANCES.pricePercentage) {
        exceptions.push({
          type: 'price',
          severity: totalVariance > 0 ? 'error' : 'warning',
          message: `Invoice total varies by ${totalVariance > 0 ? '+' : ''}$${Math.abs(totalVariance).toFixed(2)} (${variancePercentage.toFixed(1)}%)`,
          variance: totalVariance,
          tolerance: this.DEFAULT_TOLERANCES.pricePercentage
        });
        matched = false;
      }
    }

    // Check tax and freight
    if (po && invoice.taxAmount && po.taxAmount) {
      const taxVariance = Number(invoice.taxAmount) - Number(po.taxAmount);
      if (Math.abs(taxVariance) > this.DEFAULT_TOLERANCES.taxFreightCap) {
        exceptions.push({
          type: 'tax',
          severity: 'warning',
          message: `Tax variance: ${taxVariance > 0 ? '+' : ''}$${Math.abs(taxVariance).toFixed(2)}`,
          variance: taxVariance,
          tolerance: this.DEFAULT_TOLERANCES.taxFreightCap
        });
      }
    }

    if (po && invoice.freightAmount && po.freightAmount) {
      const freightVariance = Number(invoice.freightAmount) - Number(po.freightAmount);
      if (Math.abs(freightVariance) > this.DEFAULT_TOLERANCES.taxFreightCap) {
        exceptions.push({
          type: 'freight',
          severity: 'warning',
          message: `Freight variance: ${freightVariance > 0 ? '+' : ''}$${Math.abs(freightVariance).toFixed(2)}`,
          variance: freightVariance,
          tolerance: this.DEFAULT_TOLERANCES.taxFreightCap
        });
      }
    }

    // TODO: Implement line-by-line matching
    // TODO: Check delivery quantities vs invoice quantities

    const result: MatchResult = {
      matched: matched && exceptions.filter(e => e.severity === 'error').length === 0,
      exceptions,
      summary: {
        poMatch: !!po,
        deliveryMatch: !!delivery,
        priceVariance,
        quantityVariance,
        totalVariance
      }
    };

    return result;
  }

  async validateTolerances(orgId: string, variances: any): Promise<boolean> {
    // TODO: Get organization-specific tolerances from settings
    // For now, use default tolerances
    
    const { price, quantity, tax, freight } = variances;
    
    if (Math.abs(price) > this.DEFAULT_TOLERANCES.pricePercentage) return false;
    if (Math.abs(quantity) > this.DEFAULT_TOLERANCES.quantityPercentage) return false;
    if (Math.abs(tax) > this.DEFAULT_TOLERANCES.taxFreightCap) return false;
    if (Math.abs(freight) > this.DEFAULT_TOLERANCES.taxFreightCap) return false;
    
    return true;
  }

  async autoApproveInvoice(invoice: Invoice): Promise<boolean> {
    try {
      const matchResult = await this.performMatch(invoice);
      
      if (matchResult.matched) {
        await storage.updateInvoiceStatus(invoice.id, 'approved');
        
        // TODO: Create audit log
        // TODO: Queue for ERP export
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Auto-approval error:', error);
      return false;
    }
  }

  generateExceptionReport(matchResult: MatchResult): any {
    return {
      timestamp: new Date(),
      matched: matchResult.matched,
      exceptionCount: matchResult.exceptions.length,
      errorCount: matchResult.exceptions.filter(e => e.severity === 'error').length,
      warningCount: matchResult.exceptions.filter(e => e.severity === 'warning').length,
      exceptions: matchResult.exceptions,
      summary: matchResult.summary
    };
  }
}

export const threeWayMatchService = new ThreeWayMatchService();
