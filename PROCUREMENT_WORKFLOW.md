# BuildProcure AI - Procurement Workflow Guide

## Overview
This document outlines the complete workflow for material procurement from requisition to delivery and invoice processing.

## 1. Requisition Creation & Material Pool Management

### Initial Setup
- **Project Creation**: Projects are created with uploaded material lists (via Excel import)
- **Material Pool**: Each project has an initial pool of materials with quantities
- **Available Materials**: System tracks remaining quantities after each requisition

### Requisition Process
1. **Create New Requisition**: Users select project and create requisition
2. **Material Selection**: Choose from "Available Project Materials" (only shows remaining quantities)
3. **Material Depletion**: Selected materials are removed from available pool when requisition is submitted
4. **No Repopulation**: Used materials don't appear in subsequent requisitions for that project

### Requisition Statuses
- **Draft**: Editable, materials not yet committed
- **Submitted**: Materials are committed/depleted from project pool
- **Approved**: Ready for procurement action
- **Rejected**: Materials returned to available pool
- **Converted**: Requisition converted to Purchase Order

## 2. Next Steps After Requisition Submission

### Immediate Actions
1. **Approval Workflow**: Requisitions move to approval queue
2. **Material Commitment**: Selected materials are removed from project availability
3. **Procurement Planning**: Approved requisitions ready for vendor sourcing

### Workflow Progression Options

#### Option A: Direct Purchase Order Creation
1. **Convert to PO**: Approved requisitions can be directly converted to Purchase Orders
2. **Vendor Assignment**: Select appropriate vendors for materials
3. **Pricing**: Add vendor pricing and terms
4. **PO Generation**: Create formal purchase order document

#### Option B: RFQ Process (For competitive bidding)
1. **Create RFQ**: Generate Request for Quotation from approved requisition
2. **Vendor Outreach**: Send RFQ to multiple qualified vendors
3. **Quote Comparison**: Evaluate vendor responses
4. **Award Decision**: Select best vendor based on price, quality, delivery
5. **Convert to PO**: Create purchase order with winning vendor

## 3. Purchase Order Management

### PO Creation
- **Material Integration**: Line items from requisitions populate PO
- **Vendor Details**: Supplier information and terms
- **Delivery Schedule**: Expected delivery dates and locations
- **Approval**: PO approval workflow before sending to vendor

### PO Statuses
- **Draft**: Being prepared
- **Pending**: Awaiting approval
- **Sent**: Issued to vendor
- **Acknowledged**: Vendor confirmed receipt
- **In Progress**: Vendor fulfilling order
- **Completed**: All items delivered

## 4. Delivery & Receipt Management

### Delivery Process
1. **Delivery Notification**: Vendor notifies of shipment
2. **Receipt Recording**: Field team logs received materials
3. **Quantity Verification**: Confirm delivered vs ordered quantities
4. **Quality Inspection**: Check material condition and specifications
5. **Delivery Completion**: Update delivery status

### Material Tracking
- **Location Assignment**: Materials assigned to specific project zones
- **Inventory Update**: Real-time tracking of on-site materials
- **Usage Monitoring**: Track material consumption against project needs

## 5. Invoice Processing & Three-Way Matching

### Invoice Receipt
1. **Vendor Invoice**: Supplier submits invoice for delivered materials
2. **OCR Processing**: Automated invoice data extraction
3. **Line Item Mapping**: Match invoice lines to PO and delivery records

### Three-Way Matching
The system performs automatic matching between:
1. **Purchase Order**: Original order quantities and pricing
2. **Delivery Receipt**: Actually delivered quantities
3. **Vendor Invoice**: Billed quantities and amounts

### Matching Outcomes
- **Perfect Match**: Auto-approve for payment
- **Acceptable Variance**: Flag for review within tolerance
- **Significant Variance**: Hold for investigation and resolution

## 6. Material Lifecycle Summary

```
Project Materials (Initial Pool)
         ↓
Available Materials (After Previous Requisitions)
         ↓
Requisition Creation (Select Materials)
         ↓
Material Depletion (Submit Requisition)
         ↓
Approval Process
         ↓
Procurement Action (RFQ or Direct PO)
         ↓
Purchase Order Creation
         ↓
Vendor Fulfillment
         ↓
Material Delivery
         ↓
Receipt & Inspection
         ↓
Invoice Processing
         ↓
Three-Way Matching
         ↓
Payment Authorization
```

## 7. Key Benefits of This Workflow

### Material Control
- **Accurate Tracking**: Real-time visibility of material availability
- **Prevent Over-ordering**: System prevents requesting unavailable materials
- **Budget Control**: Track actual vs planned material usage

### Procurement Efficiency
- **Streamlined Process**: Integrated workflow from request to payment
- **Competitive Pricing**: RFQ process ensures best vendor pricing
- **Compliance**: Audit trail for all procurement decisions

### Project Management
- **Material Planning**: Clear visibility of project material needs
- **Delivery Coordination**: Integrated scheduling with project timeline
- **Cost Tracking**: Real-time project cost monitoring

## 8. Role-Based Access

### Field Users
- Create requisitions
- Record material receipts
- Update delivery status

### Project Managers
- Approve requisitions
- Monitor material usage
- Track project costs

### Purchasers
- Create RFQs and POs
- Manage vendor relationships
- Process invoices

### Admins
- System configuration
- User management
- Report generation

This workflow ensures complete material traceability from project planning through final payment, with robust controls to prevent material over-ordering and ensure accurate cost tracking.