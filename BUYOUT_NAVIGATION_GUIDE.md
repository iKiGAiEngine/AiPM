# Buyout Process Navigation Guide

This guide shows exactly where to navigate and what buttons to click for each step of the complete buyout workflow.

## Step 1: Field User Creates & Submits Requisition

**Where:** Navigate to **Requisitions** page
- **URL:** `/requisitions`
- **Sidebar:** Click "Requisitions" in left navigation menu

**Actions:**
1. Click **"New Requisition"** button (top right)
2. Fill out requisition form with materials needed
3. Click **"Submit Requisition"** button
4. Status changes from "Draft" → "Submitted" (yellow badge)

---

## Step 2: PM/Admin Reviews & Approves Requisition

**Where:** Navigate to **Requisitions** page
- **URL:** `/requisitions`
- **Sidebar:** Click "Requisitions" in left navigation menu

**Who Can Approve:** Only users with PM (Project Manager) or Admin roles

**Actions:**
1. Find requisitions with "Submitted" status (yellow badge)
2. Look for two new buttons in the Actions column:
   - **Green checkmark button (✓)** - Click to APPROVE
   - **Red X button (✗)** - Click to REJECT
3. Click the **green checkmark (✓)** to approve
4. Status changes from "Submitted" → "Approved" (green badge)

**Visual Indicator:** Header shows "• X pending approval" for PM/Admin users

---

## Step 3: Purchaser Creates Buyout (RFQ)

**Where:** Navigate to **Requisitions** page
- **URL:** `/requisitions`
- **Sidebar:** Click "Requisitions" in left navigation menu

**Actions:**
1. Find requisitions with "Approved" status (green badge)
2. Click **"Create Buyout"** button in the Actions column
3. This navigates to the Buyout creation form
4. Select multiple vendors for competitive bidding
5. Review line items from the requisition
6. Set bid due date
7. Click **"Create Buyout"** to generate RFQ
8. Status changes from "Approved" → "Converted" (blue badge)

---

## Step 4: View & Manage RFQs (Buyouts)

**Where:** Navigate to **Buyouts (RFQs)** page
- **URL:** `/rfqs`
- **Sidebar:** Click "RFQs" in left navigation menu

**Actions:**
1. View all created RFQs/Buyouts
2. Click **eye icon** to view RFQ details
3. Monitor bid due dates
4. Track vendor responses
5. Status progresses: "Draft" → "Sent" → "Quoted" → "Closed"

---

## Step 5: Vendor Quote Management (Future)

**Where:** **Buyouts (RFQs)** page → Individual RFQ view
- **URL:** `/rfqs/{id}`

**Actions:**
1. Vendors receive RFQ notifications (automated)
2. Vendors submit quotes through vendor portal
3. View submitted quotes for comparison
4. Click **"View Quotes"** button for RFQs with "Quoted" status

---

## Step 6: Purchase Order Creation (Future)

**Where:** **Purchase Orders** page
- **URL:** `/purchase-orders`
- **Sidebar:** Click "Purchase Orders" in left navigation menu

**Actions:**
1. Select winning vendor from quote comparison
2. Click **"Create PO"** button
3. Generate purchase order from selected quote
4. Send PO to chosen vendor

---

## Quick Reference - Page Locations

| Step | Page Name | Navigation Path | Key Buttons |
|------|-----------|----------------|-------------|
| 1 | Requisitions | Sidebar → "Requisitions" | "New Requisition" |
| 2 | Requisitions | Sidebar → "Requisitions" | Green ✓ (Approve) |
| 3 | Requisitions | Sidebar → "Requisitions" | "Create Buyout" |
| 4 | RFQs | Sidebar → "RFQs" | Eye icon (View) |
| 5 | RFQ Details | RFQs → Eye icon | "View Quotes" |
| 6 | Purchase Orders | Sidebar → "Purchase Orders" | "Create PO" |

## Role-Based Access

- **Field Users:** Can create and submit requisitions (Step 1)
- **PM/Admin:** Can approve/reject requisitions (Step 2)
- **Purchasers:** Can create buyouts and manage RFQs (Steps 3-4)
- **All Roles:** Can view relevant data based on permissions

## Status Tracking

Monitor progress through status badges:
- **Gray:** Draft
- **Yellow:** Submitted (needs approval)
- **Green:** Approved (ready for buyout)
- **Blue:** Converted (buyout created)
- **Red:** Rejected

The entire workflow is managed through the main navigation sidebar - no need to navigate to separate systems or external tools!