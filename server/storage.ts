import { 
  type Organization, type InsertOrganization,
  type User, type InsertUser,
  type Project, type InsertProject,
  type Vendor, type InsertVendor,
  type Material, type InsertMaterial,
  type Requisition, type InsertRequisition,
  type RequisitionLine, type InsertRequisitionLine,
  type RFQ, type InsertRFQ,
  type RFQLine, type InsertRFQLine,
  type Quote, type InsertQuote,
  type QuoteLine, type InsertQuoteLine,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderLine, type InsertPurchaseOrderLine,
  type Delivery, type InsertDelivery,
  type DeliveryLine, type InsertDeliveryLine,
  type Invoice, type InsertInvoice,
  type InvoiceLine, type InsertInvoiceLine,
  type Notification, type InsertNotification,
  organizations, users, projects, vendors, materials,
  requisitions, requisitionLines, rfqs, rfqLines,
  quotes, quoteLines, purchaseOrders, purchaseOrderLines,
  deliveries, deliveryLines, invoices, invoiceLines,
  notifications, projectMaterials
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Organizations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  getDemoMode(organizationId: string): Promise<boolean>;
  setDemoMode(organizationId: string, enabled: boolean): Promise<void>;
  
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  
  // Projects
  createProject(project: InsertProject & { organizationId: string }): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrganization(organizationId: string): Promise<Project[]>;
  updateProject(id: string, organizationId: string, data: Partial<Project>): Promise<Project | undefined>;
  
  // Vendors
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorsByOrganization(organizationId: string): Promise<Vendor[]>;
  
  // Materials
  createMaterial(material: InsertMaterial): Promise<Material>;
  getMaterial(id: string): Promise<Material | undefined>;

  getMaterialsByOrganization(organizationId: string): Promise<Material[]>;
  searchMaterials(organizationId: string, query: string): Promise<Material[]>;
  
  // Requisitions
  createRequisition(requisition: InsertRequisition): Promise<Requisition>;
  getRequisition(id: string): Promise<Requisition | undefined>;
  getRequisitionsByOrganization(organizationId: string): Promise<Requisition[]>;
  getRequisitionsByProject(projectId: string): Promise<Requisition[]>;
  updateRequisitionStatus(id: string, status: string): Promise<void>;
  
  // Requisition Lines
  createRequisitionLine(line: InsertRequisitionLine): Promise<RequisitionLine>;
  getRequisitionLines(requisitionId: string): Promise<RequisitionLine[]>;
  
  // RFQs
  createRFQ(rfq: InsertRFQ): Promise<RFQ>;
  getRFQ(id: string): Promise<RFQ | undefined>;
  getRFQsByOrganization(organizationId: string): Promise<RFQ[]>;
  getRFQsByProject(projectId: string): Promise<RFQ[]>;
  updateRFQStatus(id: string, status: string): Promise<void>;
  
  // RFQ Lines
  createRFQLine(line: InsertRFQLine): Promise<RFQLine>;
  getRFQLines(rfqId: string): Promise<RFQLine[]>;
  
  // Quotes
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByRFQ(rfqId: string): Promise<Quote[]>;
  getQuotesByVendor(vendorId: string): Promise<Quote[]>;
  updateQuote(id: string, updates: Partial<InsertQuote>): Promise<void>;
  
  // Quote Lines
  createQuoteLine(line: InsertQuoteLine): Promise<QuoteLine>;
  getQuoteLines(quoteId: string): Promise<QuoteLine[]>;
  
  // Purchase Orders
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByOrganization(organizationId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByProject(projectId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByVendor(vendorId: string): Promise<PurchaseOrder[]>;
  updatePurchaseOrderStatus(id: string, status: string): Promise<void>;
  
  // Purchase Order Lines
  createPurchaseOrderLine(line: InsertPurchaseOrderLine): Promise<PurchaseOrderLine>;
  getPurchaseOrderLines(poId: string): Promise<PurchaseOrderLine[]>;
  
  // Deliveries
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  getDelivery(id: string): Promise<Delivery | undefined>;
  getDeliveriesByOrganization(organizationId: string): Promise<Delivery[]>;
  getDeliveriesByPurchaseOrder(poId: string): Promise<Delivery[]>;
  updateDeliveryStatus(id: string, status: string): Promise<void>;
  
  // Delivery Lines
  createDeliveryLine(line: InsertDeliveryLine): Promise<DeliveryLine>;
  getDeliveryLines(deliveryId: string): Promise<DeliveryLine[]>;
  
  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByOrganization(organizationId: string): Promise<Invoice[]>;
  getInvoicesByVendor(vendorId: string): Promise<Invoice[]>;
  updateInvoiceStatus(id: string, status: string): Promise<void>;
  updateInvoiceMatchStatus(id: string, matchStatus: string, variance?: number, exceptions?: any): Promise<void>;
  
  // Invoice Lines
  createInvoiceLine(line: InsertInvoiceLine): Promise<InvoiceLine>;
  getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Project Materials
  getProjectMaterialsByProject(projectId: string, organizationId: string, filters?: {
    category?: string;
    costCode?: string; 
    search?: string;
  }): Promise<any[]>;
  getAvailableProjectMaterialsByProject(projectId: string, organizationId: string, filters?: {
    category?: string;
    costCode?: string; 
    search?: string;
  }): Promise<any[]>;
  
  // Global Search
  globalSearch(organizationId: string, query: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(org).returning();
    return organization;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization || undefined;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const [updatedOrg] = await db.update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrg;
  }

  async getDemoMode(organizationId: string): Promise<boolean> {
    const [org] = await db.select({ demoMode: organizations.demoMode })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return org?.demoMode || false;
  }

  async setDemoMode(organizationId: string, enabled: boolean): Promise<void> {
    await db.update(organizations)
      .set({ demoMode: enabled })
      .where(eq(organizations.id, organizationId));
  }

  // Users
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Projects
  async createProject(project: InsertProject & { organizationId: string }): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  }

  async updateProject(id: string, organizationId: string, data: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db.update(projects)
      .set(data)
      .where(and(eq(projects.id, id), eq(projects.organizationId, organizationId)))
      .returning();
    return updatedProject || undefined;
  }

  // Vendors
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async getVendorsByOrganization(organizationId: string): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.organizationId, organizationId));
  }

  // Materials
  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async getMaterialsByOrganization(organizationId: string): Promise<Material[]> {
    return await db.select().from(materials).where(eq(materials.organizationId, organizationId));
  }

  async searchMaterials(organizationId: string, query: string): Promise<Material[]> {
    return await db.select().from(materials)
      .where(and(
        eq(materials.organizationId, organizationId),
        or(
          like(materials.description, `%${query}%`),
          like(materials.model, `%${query}%`)
        )
      ));
  }

  // Requisitions
  async createRequisition(requisition: InsertRequisition): Promise<Requisition> {
    const [newRequisition] = await db.insert(requisitions).values(requisition).returning();
    return newRequisition;
  }

  async getRequisition(id: string): Promise<Requisition | undefined> {
    const [requisition] = await db.select().from(requisitions).where(eq(requisitions.id, id));
    return requisition || undefined;
  }

  async getRequisitionsByOrganization(organizationId: string): Promise<Requisition[]> {
    return await db.select().from(requisitions)
      .where(eq(requisitions.organizationId, organizationId))
      .orderBy(desc(requisitions.createdAt));
  }

  async getRequisitionsByProject(projectId: string): Promise<Requisition[]> {
    return await db.select().from(requisitions)
      .where(eq(requisitions.projectId, projectId))
      .orderBy(desc(requisitions.createdAt));
  }

  async updateRequisitionStatus(id: string, status: string): Promise<void> {
    await db.update(requisitions).set({ status: status as any }).where(eq(requisitions.id, id));
  }

  // Requisition Lines
  async createRequisitionLine(line: InsertRequisitionLine): Promise<RequisitionLine> {
    const [newLine] = await db.insert(requisitionLines).values(line).returning();
    return newLine;
  }

  async getRequisitionLines(requisitionId: string): Promise<RequisitionLine[]> {
    return await db.select().from(requisitionLines).where(eq(requisitionLines.requisitionId, requisitionId));
  }

  // RFQs
  async createRFQ(rfq: InsertRFQ): Promise<RFQ> {
    const [newRFQ] = await db.insert(rfqs).values(rfq).returning();
    return newRFQ;
  }

  async getRFQ(id: string): Promise<RFQ | undefined> {
    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, id));
    return rfq || undefined;
  }

  async getRFQsByOrganization(organizationId: string): Promise<RFQ[]> {
    return await db.select().from(rfqs)
      .where(eq(rfqs.organizationId, organizationId))
      .orderBy(desc(rfqs.createdAt));
  }

  async getRFQsByProject(projectId: string): Promise<RFQ[]> {
    return await db.select().from(rfqs)
      .where(eq(rfqs.projectId, projectId))
      .orderBy(desc(rfqs.createdAt));
  }

  async updateRFQStatus(id: string, status: string): Promise<void> {
    await db.update(rfqs).set({ status: status as any }).where(eq(rfqs.id, id));
  }

  // RFQ Lines
  async createRFQLine(line: InsertRFQLine): Promise<RFQLine> {
    const [newLine] = await db.insert(rfqLines).values(line).returning();
    return newLine;
  }

  async getRFQLines(rfqId: string): Promise<RFQLine[]> {
    return await db.select().from(rfqLines).where(eq(rfqLines.rfqId, rfqId));
  }

  // Quotes
  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByRFQ(rfqId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.rfqId, rfqId));
  }

  async getQuotesByVendor(vendorId: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.vendorId, vendorId));
  }

  // Quote Lines
  async createQuoteLine(line: InsertQuoteLine): Promise<QuoteLine> {
    const [newLine] = await db.insert(quoteLines).values(line).returning();
    return newLine;
  }

  async getQuoteLines(quoteId: string): Promise<QuoteLine[]> {
    return await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId));
  }

  async updateQuote(id: string, updates: Partial<InsertQuote>): Promise<void> {
    await db.update(quotes).set(updates).where(eq(quotes.id, id));
  }

  // Purchase Orders
  async createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [newPO] = await db.insert(purchaseOrders).values(po).returning();
    return newPO;
  }

  async getPurchaseOrder(id: string): Promise<any | undefined> {
    const [po] = await db.select({
      id: purchaseOrders.id,
      organizationId: purchaseOrders.organizationId,
      projectId: purchaseOrders.projectId,
      vendorId: purchaseOrders.vendorId,
      createdById: purchaseOrders.createdById,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      shipToAddress: purchaseOrders.shipToAddress,
      requestedDeliveryDate: purchaseOrders.requestedDeliveryDate,
      paymentTerms: purchaseOrders.paymentTerms,
      deliveryNotes: purchaseOrders.deliveryNotes,
      subtotal: purchaseOrders.subtotal,
      taxAmount: purchaseOrders.taxAmount,
      freightAmount: purchaseOrders.freightAmount,
      totalAmount: purchaseOrders.totalAmount,
      sentAt: purchaseOrders.sentAt,
      acknowledgedAt: purchaseOrders.acknowledgedAt,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      vendor: {
        id: vendors.id,
        name: vendors.name,
        company: vendors.company
      },
      project: {
        id: projects.id,
        name: projects.name,
        projectNumber: projects.projectNumber
      }
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
    .where(eq(purchaseOrders.id, id));
    return po || undefined;
  }

  async getPurchaseOrdersByOrganization(organizationId: string): Promise<any[]> {
    return await db.select({
      id: purchaseOrders.id,
      organizationId: purchaseOrders.organizationId,
      projectId: purchaseOrders.projectId,
      vendorId: purchaseOrders.vendorId,
      createdById: purchaseOrders.createdById,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      shipToAddress: purchaseOrders.shipToAddress,
      requestedDeliveryDate: purchaseOrders.requestedDeliveryDate,
      paymentTerms: purchaseOrders.paymentTerms,
      deliveryNotes: purchaseOrders.deliveryNotes,
      subtotal: purchaseOrders.subtotal,
      taxAmount: purchaseOrders.taxAmount,
      freightAmount: purchaseOrders.freightAmount,
      totalAmount: purchaseOrders.totalAmount,
      sentAt: purchaseOrders.sentAt,
      acknowledgedAt: purchaseOrders.acknowledgedAt,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      vendor: {
        id: vendors.id,
        name: vendors.name,
        company: vendors.company
      },
      project: {
        id: projects.id,
        name: projects.name,
        projectNumber: projects.projectNumber
      }
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
    .where(eq(purchaseOrders.organizationId, organizationId))
    .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrdersByProject(projectId: string): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, projectId))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrdersByVendor(vendorId: string): Promise<any[]> {
    return await db.select({
      id: purchaseOrders.id,
      organizationId: purchaseOrders.organizationId,
      projectId: purchaseOrders.projectId,
      vendorId: purchaseOrders.vendorId,
      createdById: purchaseOrders.createdById,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      shipToAddress: purchaseOrders.shipToAddress,
      requestedDeliveryDate: purchaseOrders.requestedDeliveryDate,
      paymentTerms: purchaseOrders.paymentTerms,
      deliveryNotes: purchaseOrders.deliveryNotes,
      subtotal: purchaseOrders.subtotal,
      taxAmount: purchaseOrders.taxAmount,
      freightAmount: purchaseOrders.freightAmount,
      totalAmount: purchaseOrders.totalAmount,
      sentAt: purchaseOrders.sentAt,
      acknowledgedAt: purchaseOrders.acknowledgedAt,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      vendor: {
        id: vendors.id,
        name: vendors.name,
        company: vendors.company
      },
      project: {
        id: projects.id,
        name: projects.name,
        projectNumber: projects.projectNumber
      }
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .leftJoin(projects, eq(purchaseOrders.projectId, projects.id))
    .where(eq(purchaseOrders.vendorId, vendorId))
    .orderBy(desc(purchaseOrders.createdAt));
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<void> {
    await db.update(purchaseOrders).set({ status: status as any }).where(eq(purchaseOrders.id, id));
  }

  // Purchase Order Lines
  async createPurchaseOrderLine(line: InsertPurchaseOrderLine): Promise<PurchaseOrderLine> {
    const [newLine] = await db.insert(purchaseOrderLines).values(line).returning();
    return newLine;
  }

  async getPurchaseOrderLines(poId: string): Promise<PurchaseOrderLine[]> {
    return await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
  }

  // Deliveries
  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [newDelivery] = await db.insert(deliveries).values(delivery).returning();
    return newDelivery;
  }

  async getDelivery(id: string): Promise<Delivery | undefined> {
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.id, id));
    return delivery || undefined;
  }

  async getDeliveriesByOrganization(organizationId: string): Promise<Delivery[]> {
    return await db.select().from(deliveries)
      .where(eq(deliveries.organizationId, organizationId))
      .orderBy(desc(deliveries.createdAt));
  }

  async getDeliveriesByPurchaseOrder(poId: string): Promise<Delivery[]> {
    return await db.select().from(deliveries)
      .where(eq(deliveries.poId, poId))
      .orderBy(desc(deliveries.createdAt));
  }

  async updateDeliveryStatus(id: string, status: string): Promise<void> {
    await db.update(deliveries).set({ status: status as any }).where(eq(deliveries.id, id));
  }

  // Delivery Lines
  async createDeliveryLine(line: InsertDeliveryLine): Promise<DeliveryLine> {
    const [newLine] = await db.insert(deliveryLines).values(line).returning();
    return newLine;
  }

  async getDeliveryLines(deliveryId: string): Promise<DeliveryLine[]> {
    return await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, deliveryId));
  }

  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByOrganization(organizationId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByVendor(vendorId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.vendorId, vendorId))
      .orderBy(desc(invoices.createdAt));
  }

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await db.update(invoices).set({ status: status as any }).where(eq(invoices.id, id));
  }

  async updateInvoiceMatchStatus(id: string, matchStatus: string, variance?: number, exceptions?: any): Promise<void> {
    await db.update(invoices).set({ 
      matchStatus: matchStatus as any, 
      matchVariance: variance ? variance.toString() : null,
      exceptions 
    }).where(eq(invoices.id, id));
  }

  // Invoice Lines
  async createInvoiceLine(line: InsertInvoiceLine): Promise<InvoiceLine> {
    const [newLine] = await db.insert(invoiceLines).values(line).returning();
    return newLine;
  }

  async getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
    return await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // Project Materials
  async getProjectMaterialsByProject(
    projectId: string, 
    organizationId: string, 
    filters?: { category?: string; costCode?: string; search?: string }
  ): Promise<any[]> {
    const conditions = [
      eq(projectMaterials.projectId, projectId),
      eq(projectMaterials.organizationId, organizationId)
    ];

    if (filters?.category) {
      conditions.push(eq(projectMaterials.category, filters.category));
    }
    
    if (filters?.costCode) {
      conditions.push(eq(projectMaterials.costCode, filters.costCode));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(or(
        like(projectMaterials.description, searchTerm),
        like(projectMaterials.model, searchTerm)
      ) as any);
    }

    return await db
      .select()
      .from(projectMaterials)
      .where(and(...conditions))
      .orderBy(asc(projectMaterials.description));
  }

  async getAvailableProjectMaterialsByProject(
    projectId: string, 
    organizationId: string, 
    filters?: { category?: string; costCode?: string; search?: string }
  ): Promise<any[]> {
    const conditions = [
      eq(projectMaterials.projectId, projectId),
      eq(projectMaterials.organizationId, organizationId)
    ];

    if (filters?.category) {
      conditions.push(eq(projectMaterials.category, filters.category));
    }
    
    if (filters?.costCode) {
      conditions.push(eq(projectMaterials.costCode, filters.costCode));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(or(
        like(projectMaterials.description, searchTerm),
        like(projectMaterials.model, searchTerm)
      ) as any);
    }

    // Get all project materials first
    const allMaterials = await db
      .select()
      .from(projectMaterials)
      .where(and(...conditions))
      .orderBy(asc(projectMaterials.description));

    // Get used quantities from submitted requisitions (status != 'draft')
    const usedMaterials = await db
      .select({
        materialId: requisitionLines.materialId,
        description: requisitionLines.description,
        model: sql`${requisitionLines.notes}`.as('model'), // Store model in notes field
        usedQuantity: sql<number>`COALESCE(SUM(CAST(${requisitionLines.quantity} AS DECIMAL)), 0)`.as('usedQuantity')
      })
      .from(requisitionLines)
      .innerJoin(requisitions, eq(requisitionLines.requisitionId, requisitions.id))
      .where(and(
        eq(requisitions.projectId, projectId),
        eq(requisitions.organizationId, organizationId),
        sql`${requisitions.status} != 'draft'` // Only count submitted requisitions
      ))
      .groupBy(requisitionLines.description, requisitionLines.notes); // Group by description and model

    // Create a map of used quantities by description+model combination
    const usedQuantityMap = new Map<string, number>();
    usedMaterials.forEach(used => {
      const key = `${used.description}|${used.model || ''}`;
      usedQuantityMap.set(key, Number(used.usedQuantity));
    });

    // Filter out materials that are fully consumed
    const availableMaterials = allMaterials.filter(material => {
      const key = `${material.description}|${material.model || ''}`;
      const usedQty = usedQuantityMap.get(key) || 0;
      const availableQty = Number(material.qty) - usedQty;
      
      // Only include materials that still have available quantity
      return availableQty > 0;
    }).map(material => {
      const key = `${material.description}|${material.model || ''}`;
      const usedQty = usedQuantityMap.get(key) || 0;
      const availableQty = Number(material.qty) - usedQty;
      
      // Return material with updated quantity showing available amount
      return {
        ...material,
        originalQuantity: material.qty,
        quantity: availableQty,
        usedQuantity: usedQty
      };
    });

    return availableMaterials;
  }

  // Global Search
  async globalSearch(organizationId: string, query: string): Promise<any[]> {
    const results: any[] = [];
    
    // Search projects
    const projectResults = await db.select().from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        like(projects.name, `%${query}%`)
      ));
    results.push(...projectResults.map(p => ({ ...p, type: 'project' })));

    // Search vendors
    const vendorResults = await db.select().from(vendors)
      .where(and(
        eq(vendors.organizationId, organizationId),
        or(
          like(vendors.name, `%${query}%`),
          like(vendors.company, `%${query}%`)
        )
      ));
    results.push(...vendorResults.map(v => ({ ...v, type: 'vendor' })));

    // Search purchase orders
    const poResults = await db.select().from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.organizationId, organizationId),
        like(purchaseOrders.number, `%${query}%`)
      ));
    results.push(...poResults.map(po => ({ ...po, type: 'purchase_order' })));

    // Search materials
    const materialResults = await db.select().from(materials)
      .where(and(
        eq(materials.organizationId, organizationId),
        or(
          like(materials.sku, `%${query}%`),
          like(materials.description, `%${query}%`),
          like(materials.manufacturer, `%${query}%`)
        )
      ));
    results.push(...materialResults.map(m => ({ ...m, type: 'material' })));

    return results;
  }
}

export const storage = new DatabaseStorage();
