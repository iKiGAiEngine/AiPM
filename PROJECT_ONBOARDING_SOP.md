# Project Onboarding SOP: From Excel Award to Live System

## Overview
This guide walks you through importing an awarded construction project from Excel into BuildProcure AI. Follow these steps in order for a smooth setup process.

## Prerequisites
- Project awarded by GC team
- Excel file with project details and material list
- Access to BuildProcure AI with Admin or PM permissions
- Login credentials provided by your system administrator

---

## Step 1: Log Into BuildProcure AI

1. **Navigate to Login**
   - Open your web browser
   - Go to your BuildProcure AI URL
   - Enter your credentials (provided by admin)

2. **Verify Dashboard Access**
   - You should see the main dashboard
   - Confirm you can see "Projects" in the left sidebar

---

## Step 2: Create the New Project

1. **Navigate to Projects**
   - Click "Projects" in the left sidebar
   - Click the "New Project" button (top right)

2. **Enter Basic Project Information**
   - **Project Name**: Enter the project name from your award
   - **Project Number**: Enter the GC's project number
   - **Client**: Enter the General Contractor's company name
   - **Address**: Enter the job site address
   - **Status**: Select "Active"
   - **Contract Value**: Enter your total awarded contract amount

3. **Add Cost Codes**
   - In the "Cost Codes" section, add each estimate line item
   - Format: "Description - ProjectNumber-CostCode-Division"
   - Example: "Toilet Accessories - 23479026-102800-71130"
   - Click "Add Cost Code" for each line item from your Excel

4. **Save the Project**
   - Click "Create Project" button
   - You'll be redirected to the project details page

---

## Step 3: Import Contract Estimates

### Understanding Your Excel Structure
Your Excel file likely contains columns like:
- Estimate Number/Description
- Cost Code
- Quantity
- Unit
- Unit Price
- Total Amount
- Material Category

### Manual Entry Process (Current Method)

1. **Navigate to Contract Estimates**
   - Go to Projects → [Your Project] → Contract Estimates tab
   - Click "Add Contract Estimate"

2. **For Each Row in Your Excel:**
   - **Estimate Number**: Use your internal estimate tracking number
   - **Title**: Description from Excel (e.g., "Toilet Accessories Installation")
   - **Cost Code**: Match the cost code from your Excel
   - **Awarded Value**: Total amount from Excel for this line item
   - **Quantity**: Estimated quantity from Excel
   - **Unit**: Unit of measure (each, sq ft, linear ft, etc.)
   - **Material Category**: General category (plumbing, electrical, etc.)
   - **Award Date**: Date you received the award

3. **Repeat for All Estimate Lines**
   - Create one contract estimate entry for each major line item
   - Group similar materials under one estimate if appropriate

---

## Step 4: Set Up Materials Catalog

### **Option A: Bulk CSV Import (Recommended)**

1. **Prepare Your Excel File:**
   - Save your Excel as CSV format
   - Required columns: SKU, Description, Unit, LastCost, LeadTimeDays
   - Optional columns: Manufacturer, Model, Category, Finish, MinOrderQty

2. **Import to BuildProcure AI:**
   - Click "Materials" in the left sidebar
   - Click "Import CSV" button
   - Download template if needed for reference
   - Upload your prepared CSV file
   - Review the preview of materials
   - Click "Import All Materials"

### **Option B: Manual Entry (For Small Lists)**

1. **Navigate to Materials**
   - Click "Materials" in the left sidebar
   - Click "Add Material"

2. **Enter Material Details**
   - **SKU**: Your internal part number or manufacturer SKU
   - **Description**: Detailed description from Excel
   - **Manufacturer**: Brand name
   - **Model**: Model number if available
   - **Unit**: Unit of measure (each, box, case, etc.)
   - **Category**: Group materials by type
   - **Last Cost**: Your budgeted cost from Excel
   - **Lead Time**: Typical delivery time in days

3. **Save Each Material**
   - Click "Save Material"
   - Repeat for all materials in your Excel

---

## Step 5: Set Up Vendor Information

1. **Navigate to Vendors**
   - Click "Vendors" in the left sidebar
   - Click "Add Vendor"

2. **For Each Supplier You'll Use:**
   - **Company Name**: Vendor business name
   - **Contact Name**: Your main contact person
   - **Email**: Their business email
   - **Phone**: Main contact number
   - **Address**: Vendor business address
   - **Terms**: Payment terms (Net 30, etc.)
   - **Delivery Regions**: Areas they serve

3. **Save Vendor Information**
   - This enables RFQ distribution later

---

## Step 6: Create Your First Requisition

### Test the System with One Material Request:

1. **Navigate to Requisitions**
   - Click "Requisitions" in left sidebar
   - Click "New Requisition"

2. **Fill Out Requisition Form**
   - **Project**: Select your newly created project
   - **Contract Estimate**: Select the relevant estimate
   - **Title**: "Test Material Request - [Description]"
   - **Zone**: Area of jobsite if applicable
   - **Target Delivery**: When you need materials
   - **Delivery Location**: Jobsite address or staging area

3. **Add Line Items**
   - Click "Add Line Item"
   - **Description**: Material description
   - **Quantity**: Amount needed
   - **Unit**: Each, sq ft, etc.
   - **Estimated Cost**: Expected price per unit
   - **Cost Code**: Match to your contract estimate

4. **Submit for Approval**
   - Click "Submit Requisition"
   - This moves it to "Submitted" status for PM approval

---

## Step 7: Process Through Workflow

### Approval Process:
1. **As PM/Admin**: Approve the requisition
2. **System**: Converts approved requisition to RFQ
3. **Purchasing**: Sends RFQ to selected vendors
4. **Vendors**: Submit competitive quotes
5. **Team**: Reviews quotes and awards to best value
6. **System**: Converts winning quote to Purchase Order

---

## Navigation Quick Reference

### Main Menu Items:
- **Dashboard**: Overview of all activity
- **Projects**: Manage project details and contract estimates
- **Requisitions**: Field material requests
- **RFQs**: Request for quotes from vendors
- **Purchase Orders**: Formal orders to vendors
- **Deliveries**: Track incoming materials
- **Invoices**: Process vendor bills
- **Materials**: Master catalog of all materials
- **Vendors**: Supplier contact information
- **Reports**: Project analytics and budgets

### Status Flows:
- **Requisitions**: Draft → Submitted → Approved → Converted
- **RFQs**: Draft → Sent → Quoted → Closed
- **Purchase Orders**: Draft → Sent → Acknowledged → Received
- **Deliveries**: Pending → Partial → Complete

---

## Tips for Success

1. **Start Small**: Enter one project completely before moving to others
2. **Consistent Naming**: Use the same format for cost codes and descriptions
3. **Regular Updates**: Keep material costs current for accurate budgeting
4. **Training**: Have your team practice the requisition process
5. **Backup Data**: Keep your Excel files as backup reference

---

## Common Questions

**Q: Can I bulk import from Excel?**
A: Currently, manual entry is required. Future versions will include Excel import functionality.

**Q: What if I make a mistake?**
A: Projects and materials can be edited. Contact your admin for assistance.

**Q: How do I track budget vs actual?**
A: Use the Reports section to compare contract estimates against actual spending.

**Q: Who can approve requisitions?**
A: Users with Admin or PM roles can approve requisitions.

---

## Support
If you encounter issues during setup, contact your system administrator or refer to the help documentation within the application.