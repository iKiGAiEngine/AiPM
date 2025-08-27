import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

export class PDFService {
  async generatePurchaseOrderPDF(po: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Fetch related data if needed
        const storage = require('../storage').default;
        const [vendor, project, lines] = await Promise.all([
          po.vendorId ? storage.getVendor(po.vendorId) : null,
          po.projectId ? storage.getProject(po.projectId) : null,
          storage.getPurchaseOrderLines(po.id)
        ]);

        // Header
        doc.fontSize(20).text('PURCHASE ORDER', 50, 50);
        doc.fontSize(12).text(`PO Number: ${po.number}`, 400, 50);
        doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, 400, 70);

        // Company Info
        doc.text('BuildProcure AI', 50, 100);
        doc.text('Construction Materials Procurement', 50, 115);

        // Vendor Info
        doc.text('Vendor:', 50, 160);
        doc.text(vendor?.name || 'N/A', 50, 175);
        doc.text(vendor?.address || 'N/A', 50, 190);

        // Ship To
        doc.text('Ship To:', 300, 160);
        doc.text(po.shipToAddress || 'N/A', 300, 175);

        // Project Info
        doc.text(`Project: ${project?.name || 'N/A'}`, 50, 230);
        doc.text(`Requested Delivery: ${po.requestedDeliveryDate ? new Date(po.requestedDeliveryDate).toLocaleDateString() : 'TBD'}`, 50, 245);

        // Line Items Table
        const startY = 280;
        doc.text('Item', 50, startY);
        doc.text('Description', 100, startY);
        doc.text('Qty', 350, startY);
        doc.text('Unit Price', 400, startY);
        doc.text('Total', 480, startY);

        // Table lines
        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

        let currentY = startY + 25;
        let subtotal = 0;

        if (lines && lines.length > 0) {
          lines.forEach((line: any, index: number) => {
            const unitPrice = parseFloat(line.unitPrice || 0);
            const quantity = parseFloat(line.quantity || 0);
            const lineTotal = unitPrice * quantity;
            subtotal += lineTotal;

            doc.text(`${index + 1}`, 50, currentY);
            doc.text(line.description || 'N/A', 100, currentY, { width: 240 });
            doc.text(quantity.toString(), 350, currentY);
            doc.text(`$${unitPrice.toFixed(2)}`, 400, currentY);
            doc.text(`$${lineTotal.toFixed(2)}`, 480, currentY);

            currentY += 20;
          });
        }

        // Totals
        const totalsY = currentY + 20;
        doc.moveTo(350, totalsY - 10).lineTo(550, totalsY - 10).stroke();

        doc.text('Subtotal:', 400, totalsY);
        doc.text(`$${(po.subtotal || subtotal).toFixed(2)}`, 480, totalsY);

        if (po.tax) {
          doc.text('Tax:', 400, totalsY + 15);
          doc.text(`$${parseFloat(po.tax).toFixed(2)}`, 480, totalsY + 15);
        }

        if (po.freight) {
          doc.text('Freight:', 400, totalsY + 30);
          doc.text(`$${parseFloat(po.freight).toFixed(2)}`, 480, totalsY + 30);
        }

        doc.moveTo(350, totalsY + 50).lineTo(550, totalsY + 50).stroke();
        doc.fontSize(14).text('Total:', 400, totalsY + 55);
        doc.text(`$${parseFloat(po.total || 0).toFixed(2)}`, 480, totalsY + 55);

        // Terms and Conditions
        if (po.paymentTerms) {
          doc.fontSize(12).text(`Payment Terms: ${po.paymentTerms}`, 50, totalsY + 100);
        }

        if (po.deliveryNotes) {
          doc.text('Delivery Notes:', 50, totalsY + 120);
          doc.text(po.deliveryNotes, 50, totalsY + 135, { width: 500 });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateRFQPDF(rfq: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20).text('REQUEST FOR QUOTATION', 50, 50);
        doc.fontSize(12).text(`RFQ Number: ${rfq.number}`, 400, 50);
        doc.text(`Date: ${new Date(rfq.createdAt).toLocaleDateString()}`, 400, 70);
        if (rfq.bidDueDate) {
          doc.text(`Due Date: ${new Date(rfq.bidDueDate).toLocaleDateString()}`, 400, 90);
        }

        // Project Info
        doc.text(`Project: ${rfq.project?.name || ''}`, 50, 120);
        doc.text(`Title: ${rfq.title}`, 50, 135);
        if (rfq.description) {
          doc.text(`Description: ${rfq.description}`, 50, 150, { width: 500 });
        }

        // Ship To
        if (rfq.shipToAddress) {
          doc.text('Ship To:', 50, 190);
          doc.text(rfq.shipToAddress, 50, 205);
        }

        // Line Items
        const startY = 250;
        doc.text('Item', 50, startY);
        doc.text('Description', 100, startY);
        doc.text('Quantity', 400, startY);
        doc.text('Unit', 480, startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

        let currentY = startY + 25;

        if (rfq.lines) {
          rfq.lines.forEach((line: any, index: number) => {
            doc.text(`${index + 1}`, 50, currentY);
            doc.text(line.description, 100, currentY, { width: 290 });
            doc.text(line.quantity.toString(), 400, currentY);
            doc.text(line.unit, 480, currentY);

            currentY += 25;
          });
        }

        // Instructions
        doc.text('Instructions:', 50, currentY + 30);
        doc.text('• Please provide unit pricing, lead times, and freight estimates', 50, currentY + 50);
        doc.text('• Include any alternates or substitutions', 50, currentY + 65);
        doc.text('• Submit quotes by the due date listed above', 50, currentY + 80);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateInvoiceReportPDF(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20).text('INVOICE PROCESSING REPORT', 50, 50);
        doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 50);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 70);

        // Invoice Info
        doc.text(`Vendor: ${invoice.vendor?.name || ''}`, 50, 120);
        doc.text(`Invoice Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}`, 50, 135);
        doc.text(`Total Amount: $${parseFloat(invoice.total || 0).toFixed(2)}`, 50, 150);

        // Match Status
        let statusColor = 'black';
        if (invoice.matchStatus === 'matched') statusColor = 'green';
        if (invoice.matchStatus === 'exception') statusColor = 'red';

        doc.fillColor(statusColor).text(`Match Status: ${invoice.matchStatus?.toUpperCase() || 'UNKNOWN'}`, 50, 180);
        doc.fillColor('black');

        if (invoice.matchVariance) {
          doc.text(`Variance: $${parseFloat(invoice.matchVariance).toFixed(2)}`, 50, 195);
        }

        // 3-Way Match Details
        doc.text('3-Way Match Analysis:', 50, 230);
        doc.moveTo(50, 245).lineTo(550, 245).stroke();

        // PO Match
        doc.text('Purchase Order Match:', 50, 260);
        if (invoice.po) {
          doc.text(`✓ PO Number: ${invoice.po.number}`, 70, 275);
          doc.text(`✓ PO Amount: $${parseFloat(invoice.po.total || 0).toFixed(2)}`, 70, 290);
        } else {
          doc.text('✗ No matching PO found', 70, 275);
        }

        // Delivery Match
        doc.text('Delivery Match:', 50, 320);
        // This would be populated with delivery matching logic

        // Line Items Comparison
        if (invoice.lines) {
          doc.text('Line Items:', 50, 360);
          
          const tableY = 380;
          doc.text('Description', 50, tableY);
          doc.text('Qty', 300, tableY);
          doc.text('Unit Price', 350, tableY);
          doc.text('Total', 450, tableY);

          doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke();

          let currentY = tableY + 25;
          invoice.lines.forEach((line: any) => {
            doc.text(line.description, 50, currentY, { width: 240 });
            doc.text(line.quantity.toString(), 300, currentY);
            doc.text(`$${parseFloat(line.unitPrice || 0).toFixed(2)}`, 350, currentY);
            doc.text(`$${parseFloat(line.lineTotal || 0).toFixed(2)}`, 450, currentY);
            currentY += 20;
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateDeliveryReceiptPDF(delivery: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20).text('DELIVERY RECEIPT', 50, 50);
        doc.fontSize(12).text(`Delivery Date: ${new Date(delivery.deliveryDate).toLocaleDateString()}`, 400, 50);
        doc.text(`Received: ${new Date(delivery.receivedAt).toLocaleString()}`, 400, 70);

        // Delivery Info
        doc.text(`Vendor: ${delivery.vendor?.name || ''}`, 50, 120);
        doc.text(`Received By: ${delivery.receiver?.firstName} ${delivery.receiver?.lastName}`, 50, 135);
        
        if (delivery.packingSlipNumber) {
          doc.text(`Packing Slip: ${delivery.packingSlipNumber}`, 50, 150);
        }
        
        if (delivery.trackingNumber) {
          doc.text(`Tracking: ${delivery.trackingNumber}`, 50, 165);
        }

        // Related PO
        if (delivery.po) {
          doc.text(`PO Number: ${delivery.po.number}`, 300, 120);
        }

        // Status
        doc.text(`Status: ${delivery.status?.toUpperCase()}`, 300, 135);

        // Line Items
        const startY = 200;
        doc.text('Item', 50, startY);
        doc.text('Description', 100, startY);
        doc.text('Qty Received', 350, startY);
        doc.text('Damaged', 440, startY);
        doc.text('Notes', 500, startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

        let currentY = startY + 25;

        if (delivery.lines) {
          delivery.lines.forEach((line: any, index: number) => {
            doc.text(`${index + 1}`, 50, currentY);
            doc.text(line.description, 100, currentY, { width: 240 });
            doc.text(line.quantityReceived?.toString() || '0', 350, currentY);
            doc.text(line.quantityDamaged?.toString() || '0', 440, currentY);
            
            if (line.discrepancyNotes) {
              doc.text(line.discrepancyNotes, 500, currentY, { width: 50 });
            }

            currentY += 25;
          });
        }

        // Notes
        if (delivery.notes) {
          doc.text('Delivery Notes:', 50, currentY + 30);
          doc.text(delivery.notes, 50, currentY + 45, { width: 500 });
        }

        // Signature
        doc.text('Received By:', 50, currentY + 100);
        doc.text('Signature: ________________________', 50, currentY + 130);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 300, currentY + 130);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
