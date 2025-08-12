import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  uuid, 
  timestamp, 
  numeric, 
  boolean, 
  jsonb, 
  integer,
  pgEnum,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['Admin', 'PM', 'Purchaser', 'Field', 'AP']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'on_hold', 'completed', 'cancelled']);
export const requisitionStatusEnum = pgEnum('requisition_status', ['draft', 'submitted', 'approved', 'rejected', 'converted']);
export const rfqStatusEnum = pgEnum('rfq_status', ['draft', 'sent', 'quoted', 'closed']);
export const poStatusEnum = pgEnum('po_status', ['draft', 'sent', 'acknowledged', 'received', 'closed']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'partial', 'complete', 'damaged']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['pending', 'approved', 'exception', 'paid']);
export const matchStatusEnum = pgEnum('match_status', ['matched', 'price_variance', 'qty_variance', 'missing_po', 'tax_variance', 'freight_variance']);

// Organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain").unique(),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  orgIdx: index("users_org_idx").on(table.organizationId)
}));

// Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  projectNumber: text("project_number"),
  client: text("client"),
  address: text("address"),
  status: projectStatusEnum("status").default('active'),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  contractValue: numeric("contract_value", { precision: 12, scale: 2 }),
  costCodes: text("cost_codes").array(),
  erpIds: jsonb("erp_ids"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("projects_org_idx").on(table.organizationId)
}));

// Contract Estimates - awarded estimates that become part of the contract
export const contractEstimates = pgTable("contract_estimates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  estimateNumber: text("estimate_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  costCode: text("cost_code").notNull(),
  awardedValue: numeric("awarded_value", { precision: 12, scale: 2 }).notNull(),
  estimatedQuantity: numeric("estimated_quantity", { precision: 10, scale: 2 }),
  unit: text("unit"),
  materialCategory: text("material_category"),
  awardDate: timestamp("award_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  projectIdx: index("estimates_project_idx").on(table.projectId),
  costCodeIdx: index("estimates_cost_code_idx").on(table.costCode)
}));

// Vendors
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  terms: text("terms"),
  deliveryRegions: text("delivery_regions").array(),
  taxRules: jsonb("tax_rules"),
  ediFlags: boolean("edi_flags").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("vendors_org_idx").on(table.organizationId)
}));

// Materials
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  sku: text("sku").notNull(),
  description: text("description").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  unit: text("unit").notNull(),
  category: text("category"),
  finish: text("finish"),
  mounting: text("mounting"),
  adaFlags: text("ada_flags").array(),
  leadTimeDays: integer("lead_time_days"),
  lastCost: numeric("last_cost", { precision: 10, scale: 2 }),
  minOrderQty: integer("min_order_qty").default(1),
  substitutable: boolean("substitutable").default(true),
  ofci: boolean("ofci").default(false),
  images: text("images").array(),
  specUrl: text("spec_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("materials_org_idx").on(table.organizationId),
  skuIdx: index("materials_sku_idx").on(table.sku)
}));

// Requisitions
export const requisitions = pgTable("requisitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  contractEstimateId: uuid("contract_estimate_id").references(() => contractEstimates.id),
  requesterId: uuid("requester_id").references(() => users.id).notNull(),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  zone: text("zone"),
  targetDeliveryDate: timestamp("target_delivery_date"),
  deliveryLocation: text("delivery_location"),
  specialInstructions: text("special_instructions"),
  status: requisitionStatusEnum("status").default('draft'),
  attachments: text("attachments").array(),
  geoLocation: jsonb("geo_location"),
  rfqId: uuid("rfq_id").references(() => rfqs.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("requisitions_org_idx").on(table.organizationId),
  projectIdx: index("requisitions_project_idx").on(table.projectId),
  numberIdx: index("requisitions_number_idx").on(table.number),
  estimateIdx: index("requisitions_estimate_idx").on(table.contractEstimateId)
}));

// Requisition Lines
export const requisitionLines = pgTable("requisition_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requisitionId: uuid("requisition_id").references(() => requisitions.id).notNull(),
  materialId: uuid("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  budgetedCost: numeric("budgeted_cost", { precision: 10, scale: 2 }),
  costCode: text("cost_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  reqIdx: index("req_lines_req_idx").on(table.requisitionId)
}));

// RFQs
export const rfqs = pgTable("rfqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  number: text("number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  bidDueDate: timestamp("bid_due_date"),
  shipToAddress: text("ship_to_address"),
  status: rfqStatusEnum("status").default('draft'),
  vendorIds: uuid("vendor_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("rfqs_org_idx").on(table.organizationId),
  projectIdx: index("rfqs_project_idx").on(table.projectId),
  numberIdx: index("rfqs_number_idx").on(table.number)
}));

// RFQ Lines
export const rfqLines = pgTable("rfq_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rfqId: uuid("rfq_id").references(() => rfqs.id).notNull(),
  materialId: uuid("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  rfqIdx: index("rfq_lines_rfq_idx").on(table.rfqId)
}));

// Quotes
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rfqId: uuid("rfq_id").references(() => rfqs.id).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  quotedAt: timestamp("quoted_at").defaultNow(),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  isSelected: boolean("is_selected").default(false),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  rfqIdx: index("quotes_rfq_idx").on(table.rfqId),
  vendorIdx: index("quotes_vendor_idx").on(table.vendorId)
}));

// Quote Lines
export const quoteLines = pgTable("quote_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: uuid("quote_id").references(() => quotes.id).notNull(),
  rfqLineId: uuid("rfq_line_id").references(() => rfqLines.id).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  leadTimeDays: integer("lead_time_days"),
  alternateDescription: text("alternate_description"),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  quoteIdx: index("quote_lines_quote_idx").on(table.quoteId)
}));

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  number: text("number").notNull().unique(),
  status: poStatusEnum("status").default('draft'),
  shipToAddress: text("ship_to_address"),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  paymentTerms: text("payment_terms"),
  deliveryNotes: text("delivery_notes"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  freightAmount: numeric("freight_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("pos_org_idx").on(table.organizationId),
  projectIdx: index("pos_project_idx").on(table.projectId),
  vendorIdx: index("pos_vendor_idx").on(table.vendorId),
  numberIdx: index("pos_number_idx").on(table.number)
}));

// Purchase Order Lines
export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  poId: uuid("po_id").references(() => purchaseOrders.id).notNull(),
  materialId: uuid("material_id").references(() => materials.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  poIdx: index("po_lines_po_idx").on(table.poId)
}));

// Deliveries
export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id).notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  packingSlipNumber: text("packing_slip_number"),
  trackingNumber: text("tracking_number"),
  status: deliveryStatusEnum("status").default('pending'),
  notes: text("notes"),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("deliveries_org_idx").on(table.organizationId),
  poIdx: index("deliveries_po_idx").on(table.poId)
}));

// Delivery Lines
export const deliveryLines = pgTable("delivery_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: uuid("delivery_id").references(() => deliveries.id).notNull(),
  poLineId: uuid("po_line_id").references(() => purchaseOrderLines.id),
  description: text("description").notNull(),
  quantityOrdered: numeric("quantity_ordered", { precision: 10, scale: 2 }),
  quantityReceived: numeric("quantity_received", { precision: 10, scale: 2 }).notNull(),
  quantityDamaged: numeric("quantity_damaged", { precision: 10, scale: 2 }).default('0'),
  discrepancyNotes: text("discrepancy_notes"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  deliveryIdx: index("delivery_lines_delivery_idx").on(table.deliveryId)
}));

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id).notNull(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  deliveryId: uuid("delivery_id").references(() => deliveries.id),
  uploadedById: uuid("uploaded_by_id").references(() => users.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  status: invoiceStatusEnum("status").default('pending'),
  matchStatus: matchStatusEnum("match_status"),
  matchVariance: numeric("match_variance", { precision: 12, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  freightAmount: numeric("freight_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  ocrResults: jsonb("ocr_results"),
  attachments: text("attachments").array(),
  exceptions: jsonb("exceptions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  orgIdx: index("invoices_org_idx").on(table.organizationId),
  vendorIdx: index("invoices_vendor_idx").on(table.vendorId),
  poIdx: index("invoices_po_idx").on(table.poId),
  numberIdx: index("invoices_number_idx").on(table.invoiceNumber)
}));

// Invoice Lines
export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  poLineId: uuid("po_line_id").references(() => purchaseOrderLines.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  invoiceIdx: index("invoice_lines_invoice_idx").on(table.invoiceId)
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  readIdx: index("notifications_read_idx").on(table.isRead)
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  vendors: many(vendors),
  materials: many(materials),
  requisitions: many(requisitions),
  rfqs: many(rfqs),
  purchaseOrders: many(purchaseOrders),
  deliveries: many(deliveries),
  invoices: many(invoices),
  notifications: many(notifications)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  }),
  requisitions: many(requisitions),
  rfqs: many(rfqs),
  purchaseOrders: many(purchaseOrders),
  deliveries: many(deliveries),
  invoices: many(invoices),
  notifications: many(notifications)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id]
  }),
  contractEstimates: many(contractEstimates),
  requisitions: many(requisitions),
  rfqs: many(rfqs),
  purchaseOrders: many(purchaseOrders)
}));

export const contractEstimatesRelations = relations(contractEstimates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contractEstimates.organizationId],
    references: [organizations.id]
  }),
  project: one(projects, {
    fields: [contractEstimates.projectId],
    references: [projects.id]
  }),
  requisitions: many(requisitions)
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [vendors.organizationId],
    references: [organizations.id]
  }),
  quotes: many(quotes),
  purchaseOrders: many(purchaseOrders),
  deliveries: many(deliveries),
  invoices: many(invoices)
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [materials.organizationId],
    references: [organizations.id]
  }),
  requisitionLines: many(requisitionLines),
  rfqLines: many(rfqLines),
  purchaseOrderLines: many(purchaseOrderLines)
}));

export const requisitionsRelations = relations(requisitions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [requisitions.organizationId],
    references: [organizations.id]
  }),
  project: one(projects, {
    fields: [requisitions.projectId],
    references: [projects.id]
  }),
  contractEstimate: one(contractEstimates, {
    fields: [requisitions.contractEstimateId],
    references: [contractEstimates.id]
  }),
  requester: one(users, {
    fields: [requisitions.requesterId],
    references: [users.id]
  }),
  rfq: one(rfqs, {
    fields: [requisitions.rfqId],
    references: [rfqs.id]
  }),
  lines: many(requisitionLines)
}));

export const requisitionLinesRelations = relations(requisitionLines, ({ one }) => ({
  requisition: one(requisitions, {
    fields: [requisitionLines.requisitionId],
    references: [requisitions.id]
  }),
  material: one(materials, {
    fields: [requisitionLines.materialId],
    references: [materials.id]
  })
}));

export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [rfqs.organizationId],
    references: [organizations.id]
  }),
  project: one(projects, {
    fields: [rfqs.projectId],
    references: [projects.id]
  }),
  createdBy: one(users, {
    fields: [rfqs.createdById],
    references: [users.id]
  }),
  lines: many(rfqLines),
  quotes: many(quotes),
  requisitions: many(requisitions)
}));

export const rfqLinesRelations = relations(rfqLines, ({ one, many }) => ({
  rfq: one(rfqs, {
    fields: [rfqLines.rfqId],
    references: [rfqs.id]
  }),
  material: one(materials, {
    fields: [rfqLines.materialId],
    references: [materials.id]
  }),
  quoteLines: many(quoteLines)
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  rfq: one(rfqs, {
    fields: [quotes.rfqId],
    references: [rfqs.id]
  }),
  vendor: one(vendors, {
    fields: [quotes.vendorId],
    references: [vendors.id]
  }),
  lines: many(quoteLines)
}));

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteLines.quoteId],
    references: [quotes.id]
  }),
  rfqLine: one(rfqLines, {
    fields: [quoteLines.rfqLineId],
    references: [rfqLines.id]
  })
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [purchaseOrders.organizationId],
    references: [organizations.id]
  }),
  project: one(projects, {
    fields: [purchaseOrders.projectId],
    references: [projects.id]
  }),
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id]
  }),
  createdBy: one(users, {
    fields: [purchaseOrders.createdById],
    references: [users.id]
  }),
  lines: many(purchaseOrderLines),
  deliveries: many(deliveries),
  invoices: many(invoices)
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderLines.poId],
    references: [purchaseOrders.id]
  }),
  material: one(materials, {
    fields: [purchaseOrderLines.materialId],
    references: [materials.id]
  }),
  deliveryLines: many(deliveryLines),
  invoiceLines: many(invoiceLines)
}));

export const deliveriesRelations = relations(deliveries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deliveries.organizationId],
    references: [organizations.id]
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [deliveries.poId],
    references: [purchaseOrders.id]
  }),
  vendor: one(vendors, {
    fields: [deliveries.vendorId],
    references: [vendors.id]
  }),
  receiver: one(users, {
    fields: [deliveries.receiverId],
    references: [users.id]
  }),
  lines: many(deliveryLines),
  invoices: many(invoices)
}));

export const deliveryLinesRelations = relations(deliveryLines, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryLines.deliveryId],
    references: [deliveries.id]
  }),
  purchaseOrderLine: one(purchaseOrderLines, {
    fields: [deliveryLines.poLineId],
    references: [purchaseOrderLines.id]
  })
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id]
  }),
  vendor: one(vendors, {
    fields: [invoices.vendorId],
    references: [vendors.id]
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [invoices.poId],
    references: [purchaseOrders.id]
  }),
  delivery: one(deliveries, {
    fields: [invoices.deliveryId],
    references: [deliveries.id]
  }),
  uploadedBy: one(users, {
    fields: [invoices.uploadedById],
    references: [users.id]
  }),
  lines: many(invoiceLines)
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id]
  }),
  purchaseOrderLine: one(purchaseOrderLines, {
    fields: [invoiceLines.poLineId],
    references: [purchaseOrderLines.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id]
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

// Material Import tables
export const materialImportRuns = pgTable('material_import_runs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  uploadedByUserId: uuid('uploaded_by_user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  sourceFilename: text('source_filename').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'review', 'approved', 'rejected'
  rowCount: integer('row_count').default(0),
  warningsJson: jsonb('warnings_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const materialImportLines = pgTable('material_import_lines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  runId: uuid('run_id').notNull().references(() => materialImportRuns.id),
  rawRowJson: jsonb('raw_row_json'),
  // normalized fields
  category: text('category'),
  manufacturer: text('manufacturer'),
  model: text('model'), 
  sku: text('sku'),
  description: text('description'),
  unit: text('unit'),
  qty: numeric('qty', { precision: 10, scale: 3 }),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  costCode: text('cost_code'),
  phaseCode: text('phase_code'),
  projectCode: text('project_code'),
  // status
  valid: boolean('valid').default(false),
  errorsJson: jsonb('errors_json'),
  suggestionsJson: jsonb('suggestions_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMaterials = pgTable('project_materials', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  category: text('category'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  sku: text('sku'),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  qty: numeric('qty', { precision: 10, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).default('0'),
  costCode: text('cost_code'),
  phaseCode: text('phase_code'),
  projectCode: text('project_code'),
  source: text('source').default('manual'), // 'manual' or 'import'
  importRunId: uuid('import_run_id').references(() => materialImportRuns.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const projectBudgetRollups = pgTable('project_budget_rollups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  costCode: text('cost_code').notNull(),
  totalBudget: numeric('total_budget', { precision: 12, scale: 2 }).default('0'),
  totalMaterialsValue: numeric('total_materials_value', { precision: 12, scale: 2 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueProjectCostCode: unique().on(table.projectId, table.costCode),
}));

// Relations for new tables
export const materialImportRunsRelations = relations(materialImportRuns, ({ one, many }) => ({
  project: one(projects, {
    fields: [materialImportRuns.projectId],
    references: [projects.id]
  }),
  organization: one(organizations, {
    fields: [materialImportRuns.organizationId],
    references: [organizations.id]
  }),
  uploadedBy: one(users, {
    fields: [materialImportRuns.uploadedByUserId],
    references: [users.id]
  }),
  lines: many(materialImportLines),
  projectMaterials: many(projectMaterials)
}));

export const materialImportLinesRelations = relations(materialImportLines, ({ one }) => ({
  run: one(materialImportRuns, {
    fields: [materialImportLines.runId],
    references: [materialImportRuns.id]
  })
}));

export const projectMaterialsRelations = relations(projectMaterials, ({ one }) => ({
  project: one(projects, {
    fields: [projectMaterials.projectId],
    references: [projects.id]
  }),
  organization: one(organizations, {
    fields: [projectMaterials.organizationId],
    references: [organizations.id]
  }),
  importRun: one(materialImportRuns, {
    fields: [projectMaterials.importRunId],
    references: [materialImportRuns.id]
  })
}));

export const projectBudgetRollupsRelations = relations(projectBudgetRollups, ({ one }) => ({
  project: one(projects, {
    fields: [projectBudgetRollups.projectId],
    references: [projects.id]
  }),
  organization: one(organizations, {
    fields: [projectBudgetRollups.organizationId],
    references: [organizations.id]
  })
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true
});

export const insertContractEstimateSchema = createInsertSchema(contractEstimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRequisitionSchema = createInsertSchema(requisitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRequisitionLineSchema = createInsertSchema(requisitionLines).omit({
  id: true,
  createdAt: true
});

export const insertRfqSchema = createInsertSchema(rfqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRfqLineSchema = createInsertSchema(rfqLines).omit({
  id: true,
  createdAt: true
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true
});

export const insertQuoteLineSchema = createInsertSchema(quoteLines).omit({
  id: true,
  createdAt: true
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  acknowledgedAt: true
});

export const insertPurchaseOrderLineSchema = createInsertSchema(purchaseOrderLines).omit({
  id: true,
  createdAt: true
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  receivedAt: true
});

export const insertDeliveryLineSchema = createInsertSchema(deliveryLines).omit({
  id: true,
  createdAt: true
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInvoiceLineSchema = createInsertSchema(invoiceLines).omit({
  id: true,
  createdAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

export const insertMaterialImportRunSchema = createInsertSchema(materialImportRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMaterialImportLineSchema = createInsertSchema(materialImportLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProjectMaterialSchema = createInsertSchema(projectMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProjectBudgetRollupSchema = createInsertSchema(projectBudgetRollups).omit({
  id: true,
  updatedAt: true
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ContractEstimate = typeof contractEstimates.$inferSelect;
export type InsertContractEstimate = z.infer<typeof insertContractEstimateSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type Requisition = typeof requisitions.$inferSelect;
export type InsertRequisition = z.infer<typeof insertRequisitionSchema>;

export type RequisitionLine = typeof requisitionLines.$inferSelect;
export type InsertRequisitionLine = z.infer<typeof insertRequisitionLineSchema>;

export type RFQ = typeof rfqs.$inferSelect;
export type InsertRFQ = z.infer<typeof insertRfqSchema>;

export type RFQLine = typeof rfqLines.$inferSelect;
export type InsertRFQLine = z.infer<typeof insertRfqLineSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteLine = typeof quoteLines.$inferSelect;
export type InsertQuoteLine = z.infer<typeof insertQuoteLineSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;
export type InsertPurchaseOrderLine = z.infer<typeof insertPurchaseOrderLineSchema>;

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;

export type DeliveryLine = typeof deliveryLines.$inferSelect;
export type InsertDeliveryLine = z.infer<typeof insertDeliveryLineSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = z.infer<typeof insertInvoiceLineSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type MaterialImportRun = typeof materialImportRuns.$inferSelect;
export type InsertMaterialImportRun = z.infer<typeof insertMaterialImportRunSchema>;

export type MaterialImportLine = typeof materialImportLines.$inferSelect;
export type InsertMaterialImportLine = z.infer<typeof insertMaterialImportLineSchema>;

export type ProjectMaterial = typeof projectMaterials.$inferSelect;
export type InsertProjectMaterial = z.infer<typeof insertProjectMaterialSchema>;

export type ProjectBudgetRollup = typeof projectBudgetRollups.$inferSelect;
export type InsertProjectBudgetRollup = z.infer<typeof insertProjectBudgetRollupSchema>;
