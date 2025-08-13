import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  authenticateToken, 
  requireRole, 
  requireOrganization, 
  hashPassword, 
  verifyPassword, 
  generateTokens,
  type AuthenticatedRequest 
} from "./middleware/auth";
import { z } from "zod";
import { insertUserSchema, insertProjectSchema, insertVendorSchema, insertMaterialSchema, insertRequisitionSchema, insertRfqSchema, insertPurchaseOrderSchema, insertDeliverySchema, insertInvoiceSchema, type InsertProject } from "@shared/schema";
import { threeWayMatchService } from "./services/three-way-match";
import { emailService } from "./services/email";
import { ocrService } from "./services/ocr";
import { PDFService } from "./services/pdf";
import materialImportsRouter from "./routes/material-imports";

const pdfService = new PDFService();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const tokens = generateTokens({
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role
      });

      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        },
        ...tokens 
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      // TODO: Implement refresh token validation
      res.json({ message: "Refresh token endpoint - to be implemented" });
    } catch (error) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  // Protected routes middleware
  app.use("/api", authenticateToken);
  app.use("/api", requireOrganization);

  // User routes
  app.get("/api/users/me", async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.user!.organizationId);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireRole(['Admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(userData.password);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        organizationId: req.user!.organizationId
      });
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Organization routes
  app.get("/api/organization", async (req: AuthenticatedRequest, res) => {
    try {
      const organization = await storage.getOrganization(req.user!.organizationId);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await storage.getProjectsByOrganization(req.user!.organizationId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      const projectData = insertProjectSchema.parse(req.body);
      console.log('Parsed project data:', JSON.stringify(projectData, null, 2));
      const project = await storage.createProject({
        ...projectData,
        organizationId: req.user!.organizationId
      } as InsertProject & { organizationId: string });
      res.status(201).json(project);
    } catch (error) {
      console.error('Project validation error details:', error);
      if (error && typeof error === 'object' && 'issues' in error) {
        console.log('Validation issues:', JSON.stringify((error as any).issues, null, 2));
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid project data" });
      }
    }
  });

  app.get("/api/projects/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const projectData = {
        name: req.body.name,
        projectNumber: req.body.projectNumber,
        client: req.body.client,
        address: req.body.address,
        budget: req.body.budget,
        status: req.body.status,
        description: req.body.description,
      };
      
      const project = await storage.updateProject(req.params.id, req.user!.organizationId, projectData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Project materials route
  app.get("/api/projects/:id/materials", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { available } = req.query;
      
      // If available=true query param, return only available materials (excluding used ones)
      if (available === 'true') {
        const materials = await storage.getAvailableProjectMaterialsByProject(
          req.params.id, 
          req.user!.organizationId
        );
        res.json(materials);
      } else {
        // Default behavior - return all project materials
        const materials = await storage.getProjectMaterialsByProject(
          req.params.id, 
          req.user!.organizationId
        );
        res.json(materials);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project materials" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req: AuthenticatedRequest, res) => {
    try {
      const vendors = await storage.getVendorsByOrganization(req.user!.organizationId);
      res.json(vendors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  app.post("/api/vendors", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor({
        ...vendorData,
        organizationId: req.user!.organizationId
      });
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid vendor data" });
    }
  });

  app.get("/api/vendors/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor || vendor.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  // Material routes
  app.get("/api/materials", async (req: AuthenticatedRequest, res) => {
    try {
      const { search } = req.query;
      let materials;
      
      if (search && typeof search === 'string') {
        materials = await storage.searchMaterials(req.user!.organizationId, search);
      } else {
        materials = await storage.getMaterialsByOrganization(req.user!.organizationId);
      }
      
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial({
        ...materialData,
        organizationId: req.user!.organizationId
      });
      res.status(201).json(material);
    } catch (error) {
      res.status(400).json({ error: "Invalid material data" });
    }
  });

  app.post("/api/materials/import", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const { organizationId, materials } = req.body;
      
      if (organizationId !== req.user!.organizationId) {
        return res.status(403).json({ error: "Organization mismatch" });
      }

      const results = {
        success: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      for (let i = 0; i < materials.length; i++) {
        try {
          const materialData = insertMaterialSchema.parse({
            ...materials[i],
            organizationId: req.user!.organizationId
          });
          
          await storage.createMaterial(materialData);
          results.success++;
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : "Invalid material data",
            data: materials[i]
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(400).json({ error: "Invalid import data" });
    }
  });

  // Requisition routes
  app.get("/api/requisitions", async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.query;
      let requisitions;
      
      if (projectId && typeof projectId === 'string') {
        requisitions = await storage.getRequisitionsByProject(projectId);
      } else {
        requisitions = await storage.getRequisitionsByOrganization(req.user!.organizationId);
      }
      
      res.json(requisitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requisitions" });
    }
  });

  app.post("/api/requisitions", async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      console.log('User info:', { id: req.user?.id, organizationId: req.user?.organizationId });
      
      // Import the schema at runtime to avoid circular imports
      const { RequisitionCreateSchema } = await import('./schemas/requisition.js');
      
      // Validate the entire request body with Zod
      const validatedData = RequisitionCreateSchema.parse(req.body);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      
      const { lines, ...reqData } = validatedData;
      
      // Generate unique requisition number
      const year = new Date().getFullYear();
      const count = (await storage.getRequisitionsByOrganization(req.user!.organizationId)).length + 1;
      const number = `REQ-${year}-${count.toString().padStart(4, '0')}`;
      
      // Prepare requisition data with required fields from JWT token
      const requisitionData = {
        ...reqData,
        number,
        organizationId: req.user!.organizationId,
        requesterId: req.user!.id,
        // Date is already processed as ISO string by schema transform
        targetDeliveryDate: reqData.targetDeliveryDate || null,
        contractEstimateId: reqData.contractEstimateId || null,
        zone: reqData.zone || null,
        attachments: reqData.attachments || [],
        geoLocation: reqData.geoLocation || null,
        rfqId: reqData.rfqId || null
      };
      
      console.log('Final requisition data for DB:', JSON.stringify(requisitionData, null, 2));
      
      // Convert ISO string back to Date object for insertRequisitionSchema
      const dbRequisitionData = {
        ...requisitionData,
        targetDeliveryDate: requisitionData.targetDeliveryDate ? new Date(requisitionData.targetDeliveryDate) : null
      };
      
      // Use the existing insertRequisitionSchema for final validation before DB
      const dbRequisition = insertRequisitionSchema.parse(dbRequisitionData);
      
      // Create requisition
      const requisition = await storage.createRequisition(dbRequisition);
      
      // Create requisition lines
      if (lines && lines.length > 0) {
        for (const line of lines) {
          // Always set materialId to null to avoid foreign key constraint issues
          // The description field contains the material information
          await storage.createRequisitionLine({
            requisitionId: requisition.id,
            materialId: null, // Temporarily set to null to avoid foreign key issues
            description: line.description,
            quantity: line.quantity.toString(),
            unit: line.unit,
            estimatedCost: line.estimatedCost ? line.estimatedCost.toString() : null,
            notes: line.notes || null
          });
        }
      }
      
      res.status(201).json(requisition);
    } catch (error) {
      console.error('Requisition creation error:', error);
      
      // Enhanced error handling with specific Zod validation errors
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.issues, null, 2));
        
        const validationErrors = error.issues.map(err => {
          const field = err.path.join('.');
          const message = err.message;
          
          // Provide more helpful error messages for common validation failures
          let helpfulMessage = message;
          if (field === 'projectId' && err.code === 'invalid_string') {
            helpfulMessage = 'Please select a valid project';
          } else if (field === 'title' && err.code === 'too_small') {
            helpfulMessage = 'Requisition title is required';
          } else if (field === 'lines' && err.code === 'too_small') {
            helpfulMessage = 'At least one line item is required';
          } else if (field.includes('lines') && field.includes('quantity')) {
            helpfulMessage = 'Quantity must be a positive number';
          } else if (field.includes('lines') && field.includes('unit')) {
            helpfulMessage = 'Unit is required for each line item';
          } else if (field.includes('lines') && field.includes('description')) {
            helpfulMessage = 'Description is required for each line item';
          }
          
          return {
            field,
            message: helpfulMessage,
            code: err.code,
            received: err.code === 'invalid_type' ? 'received' in err ? err.received : 'invalid' : undefined
          };
        });
        
        console.log('Validation errors:', JSON.stringify(validationErrors, null, 2));
        
        return res.status(400).json({
          error: "Validation Error",
          message: "Please check the following fields and try again:",
          validationErrors,
          details: validationErrors.map(e => `${e.field}: ${e.message}`).join('; ')
        });
      }
      
      console.error('Unexpected error:', error);
      res.status(500).json({ 
        error: "Failed to create requisition", 
        message: process.env.NODE_ENV === 'development' ? String(error) : 'An unexpected error occurred. Please try again.'
      });
    }
  });

  app.patch("/api/requisitions/:id/status", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      await storage.updateRequisitionStatus(req.params.id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  // RFQ routes
  app.get("/api/rfqs", async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.query;
      let rfqs;
      
      if (projectId && typeof projectId === 'string') {
        rfqs = await storage.getRFQsByProject(projectId);
      } else {
        rfqs = await storage.getRFQsByOrganization(req.user!.organizationId);
      }
      
      res.json(rfqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RFQs" });
    }
  });

  app.post("/api/rfqs", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const rfqData = insertRfqSchema.parse(req.body);
      
      // Generate RFQ number
      const year = new Date().getFullYear();
      const count = (await storage.getRFQsByOrganization(req.user!.organizationId)).length + 1;
      const number = `RFQ-${year}-${count.toString().padStart(3, '0')}`;
      
      const rfq = await storage.createRFQ({
        ...rfqData,
        number,
        organizationId: req.user!.organizationId,
        createdById: req.user!.id
      });
      
      res.status(201).json(rfq);
    } catch (error) {
      res.status(400).json({ error: "Invalid RFQ data" });
    }
  });

  // Quote routes
  app.get("/api/rfqs/:rfqId/quotes", async (req: AuthenticatedRequest, res) => {
    try {
      const quotes = await storage.getQuotesByRFQ(req.params.rfqId);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Purchase Order routes
  app.get("/api/purchase-orders", async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, vendorId } = req.query;
      let purchaseOrders;
      
      if (projectId && typeof projectId === 'string') {
        purchaseOrders = await storage.getPurchaseOrdersByProject(projectId);
      } else if (vendorId && typeof vendorId === 'string') {
        purchaseOrders = await storage.getPurchaseOrdersByVendor(vendorId);
      } else {
        purchaseOrders = await storage.getPurchaseOrdersByOrganization(req.user!.organizationId);
      }
      
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/purchase-orders", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const poData = insertPurchaseOrderSchema.parse(req.body);
      
      // Generate PO number
      const year = new Date().getFullYear();
      const count = (await storage.getPurchaseOrdersByOrganization(req.user!.organizationId)).length + 1;
      const number = `PO-${year}-${count.toString().padStart(3, '0')}`;
      
      const purchaseOrder = await storage.createPurchaseOrder({
        ...poData,
        number,
        organizationId: req.user!.organizationId,
        createdById: req.user!.id
      });
      
      res.status(201).json(purchaseOrder);
    } catch (error) {
      res.status(400).json({ error: "Invalid purchase order data" });
    }
  });

  app.get("/api/purchase-orders/:id/pdf", async (req: AuthenticatedRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      const pdfBuffer = await pdfService.generatePurchaseOrderPDF(po);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${po.number}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Delivery routes
  app.get("/api/deliveries", async (req: AuthenticatedRequest, res) => {
    try {
      const { poId } = req.query;
      let deliveries;
      
      if (poId && typeof poId === 'string') {
        deliveries = await storage.getDeliveriesByPurchaseOrder(poId);
      } else {
        deliveries = await storage.getDeliveriesByOrganization(req.user!.organizationId);
      }
      
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deliveries" });
    }
  });

  app.post("/api/deliveries", requireRole(['Admin', 'PM', 'Field']), async (req: AuthenticatedRequest, res) => {
    try {
      const deliveryData = insertDeliverySchema.parse(req.body);
      const delivery = await storage.createDelivery({
        ...deliveryData,
        organizationId: req.user!.organizationId,
        receiverId: req.user!.id
      });
      
      res.status(201).json(delivery);
    } catch (error) {
      res.status(400).json({ error: "Invalid delivery data" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req: AuthenticatedRequest, res) => {
    try {
      const { vendorId } = req.query;
      let invoices;
      
      if (vendorId && typeof vendorId === 'string') {
        invoices = await storage.getInvoicesByVendor(vendorId);
      } else {
        invoices = await storage.getInvoicesByOrganization(req.user!.organizationId);
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice({
        ...invoiceData,
        organizationId: req.user!.organizationId,
        uploadedById: req.user!.id
      });
      
      // Perform 3-way match
      try {
        const matchResult = await threeWayMatchService.performMatch(invoice);
        await storage.updateInvoiceMatchStatus(
          invoice.id, 
          matchResult.matched ? 'matched' : 'exception',
          matchResult.summary.totalVariance,
          matchResult.exceptions
        );
      } catch (matchError) {
        console.error('3-way match failed:', matchError);
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.post("/api/invoices/upload-ocr", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      const { fileUrl, fileType } = req.body;
      
      let ocrResult;
      if (fileType === 'pdf') {
        ocrResult = await ocrService.extractFromPdf(fileUrl);
      } else {
        ocrResult = await ocrService.extractFromImage(fileUrl);
      }
      
      res.json(ocrResult);
    } catch (error) {
      res.status(500).json({ error: "OCR processing failed" });
    }
  });

  app.patch("/api/invoices/:id/status", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      await storage.updateInvoiceStatus(req.params.id, status);
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req: AuthenticatedRequest, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: AuthenticatedRequest, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(400).json({ error: "Failed to mark notification as read" });
    }
  });

  // Global search
  app.get("/api/search", async (req: AuthenticatedRequest, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      
      const results = await storage.globalSearch(req.user!.organizationId, q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req: AuthenticatedRequest, res) => {
    try {
      const [
        requisitions,
        purchaseOrders, 
        invoices,
        projects
      ] = await Promise.all([
        storage.getRequisitionsByOrganization(req.user!.organizationId),
        storage.getPurchaseOrdersByOrganization(req.user!.organizationId),
        storage.getInvoicesByOrganization(req.user!.organizationId),
        storage.getProjectsByOrganization(req.user!.organizationId)
      ]);

      const stats = {
        openRequisitions: requisitions.filter(r => r.status === 'submitted').length,
        pendingPOs: purchaseOrders.filter(po => po.status === 'draft' || po.status === 'sent').length,
        invoiceExceptions: invoices.filter(i => i.status === 'exception').length,
        costSavings: '23400', // This would be calculated from actual data
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Project Materials routes
  app.get("/api/projects/:projectId/materials", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const { category, costCode, search } = req.query;
      
      const materials = await storage.getProjectMaterialsByProject(projectId, req.user!.organizationId, {
        category: category as string,
        costCode: costCode as string,
        search: search as string
      });
      
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project materials" });
    }
  });

  // Material Imports routes
  app.use("/api", materialImportsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
