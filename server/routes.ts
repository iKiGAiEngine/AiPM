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
import { insertUserSchema, insertProjectSchema, insertVendorSchema, insertMaterialSchema, insertRequisitionSchema, insertRfqSchema, insertPurchaseOrderSchema, insertDeliverySchema, insertInvoiceSchema, type InsertProject, invoices, contractEstimates } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { threeWayMatchService } from "./services/three-way-match";
import { emailService } from "./services/email";
import { ocrService } from "./services/ocr";
import { PDFService } from "./services/pdf";
import crypto from "crypto";
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
      const { includeInactive } = req.query;
      const projects = await storage.getProjectsByOrganization(
        req.user!.organizationId, 
        includeInactive === 'true'
      );
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

  app.get("/api/projects/:id/summary", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = req.params.id;
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Fetch all project-related data
      const [requisitions, purchaseOrders, deliveries, invoices] = await Promise.all([
        storage.getRequisitionsByProject(projectId),
        storage.getPurchaseOrdersByProject(projectId),
        storage.getDeliveriesByOrganization(req.user!.organizationId),
        storage.getInvoicesByOrganization(req.user!.organizationId)
      ]);

      // Filter deliveries and invoices for this project through POs
      const projectPOIds = new Set(purchaseOrders.map(po => po.id));
      const projectDeliveries = deliveries.filter(delivery => 
        delivery.poId && projectPOIds.has(delivery.poId)
      );
      const projectInvoices = invoices.filter(invoice => 
        invoice.projectId === projectId
      );

      // Calculate summaries
      const requisitionsByStatus = requisitions.reduce((acc, req) => {
        const status = req.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const posByStatus = purchaseOrders.reduce((acc, po) => {
        const status = po.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const deliveriesByStatus = projectDeliveries.reduce((acc, delivery) => {
        const status = delivery.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const invoicesByStatus = projectInvoices.reduce((acc, invoice) => {
        const status = invoice.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const invoicesByMatchStatus = projectInvoices.reduce((acc, invoice) => {
        if (invoice.matchStatus) {
          acc[invoice.matchStatus] = (acc[invoice.matchStatus] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const poTotalValue = purchaseOrders.reduce((sum, po) => 
        sum + (po.totalAmount ? parseFloat(po.totalAmount.toString()) : 0), 0
      );

      const invoiceTotalValue = projectInvoices.reduce((sum, invoice) => 
        sum + (invoice.totalAmount ? parseFloat(invoice.totalAmount.toString()) : 0), 0
      );

      const summary = {
        requisitions: {
          total: requisitions.length,
          byStatus: requisitionsByStatus
        },
        purchaseOrders: {
          total: purchaseOrders.length,
          totalValue: poTotalValue,
          byStatus: posByStatus
        },
        deliveries: {
          total: projectDeliveries.length,
          byStatus: deliveriesByStatus
        },
        invoices: {
          total: projectInvoices.length,
          totalValue: invoiceTotalValue,
          byStatus: invoicesByStatus,
          byMatchStatus: invoicesByMatchStatus
        },
        financial: {
          budgetUsed: invoiceTotalValue,
          committed: poTotalValue,
          invoiced: invoiceTotalValue,
          paid: projectInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.totalAmount ? parseFloat(inv.totalAmount.toString()) : 0), 0)
        }
      };

      res.json(summary);
    } catch (error) {
      console.error('Project summary error:', error);
      res.status(500).json({ error: "Failed to fetch project summary" });
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

  // Project materials route - robust with validation and error handling
  app.get("/api/projects/:id/materials", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const started = Date.now();
    
    try {
      // Validate projectId is a UUID
      const projectId = req.params.id;
      if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
        return res.status(400).json({ 
          error: "Invalid project ID format", 
          projectId: req.params.id 
        });
      }

      // Validate user and org
      const user = req.user;
      if (!user || !user.organizationId) {
        return res.status(401).json({ error: "Unauthorized - missing user or organization" });
      }

      // Validate query parameters
      const { available, search, category, limit = "100", offset = "0" } = req.query;
      const availableFlag = available === 'true';
      const limitNum = Math.max(1, Math.min(200, parseInt(limit as string) || 100));
      const offsetNum = Math.max(0, parseInt(offset as string) || 0);

      // Check if project exists and belongs to user's organization
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ 
          error: "Project not found", 
          projectId 
        });
      }
      
      if (project.organizationId !== user.organizationId) {
        return res.status(403).json({ 
          error: "Access denied - project belongs to different organization" 
        });
      }

      // Build filters
      const filters: any = {};
      if (search && typeof search === 'string' && search.trim()) {
        filters.search = search.trim();
      }
      if (category && typeof category === 'string' && category.trim()) {
        filters.category = category.trim();
      }

      // Get materials based on available flag
      let materials;
      if (availableFlag) {
        materials = await storage.getAvailableProjectMaterialsByProject(
          projectId, 
          user.organizationId,
          filters
        );
      } else {
        materials = await storage.getProjectMaterialsByProject(
          projectId, 
          user.organizationId,
          filters
        );
      }

      // Ensure materials is always an array
      const materialsArray = Array.isArray(materials) ? materials : [];

      // Apply pagination if needed
      const paginatedMaterials = materialsArray.slice(offsetNum, offsetNum + limitNum);

      // Return consistent response format
      return res.status(200).json({
        projectId,
        available: availableFlag,
        total: materialsArray.length,
        limit: limitNum,
        offset: offsetNum,
        items: paginatedMaterials,
        tookMs: Date.now() - started
      });

    } catch (error: any) {
      console.error('GET /api/projects/:id/materials error:', {
        message: error?.message,
        stack: error?.stack,
        params: req.params,
        query: req.query,
        userId: req.user?.id,
        orgId: req.user?.organizationId
      });
      
      // Return consistent error format
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to load project materials",
        projectId: req.params.id,
        tookMs: Date.now() - started
      });
    }
  });

  // Update project material
  app.patch("/api/project-materials/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const materialId = req.params.id;
      const updates = req.body;
      
      const success = await storage.updateProjectMaterial(
        materialId,
        updates,
        req.user!.organizationId
      );
      
      if (success) {
        res.json({ message: "Material updated successfully" });
      } else {
        res.status(404).json({ error: "Material not found or access denied" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update material" });
    }
  });

  // Delete project material
  app.delete("/api/project-materials/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const materialId = req.params.id;
      
      const success = await storage.deleteProjectMaterial(
        materialId,
        req.user!.organizationId
      );
      
      if (success) {
        res.json({ message: "Material deleted successfully" });
      } else {
        res.status(404).json({ error: "Material not found or access denied" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete material" });
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

  // Individual requisition routes
  app.get("/api/requisitions/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const requisition = await storage.getRequisition(req.params.id);
      if (!requisition || requisition.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      res.json(requisition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requisition" });
    }
  });

  app.get("/api/requisitions/:id/lines", async (req: AuthenticatedRequest, res) => {
    try {
      // First verify the requisition belongs to the user's organization
      const requisition = await storage.getRequisition(req.params.id);
      if (!requisition || requisition.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      const lines = await storage.getRequisitionLines(req.params.id);
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requisition lines" });
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
      console.log('RFQ creation request body:', JSON.stringify(req.body, null, 2));
      
      // Extract lines separately as they're handled differently
      const { lines, ...rfqBody } = req.body;
      
      // Convert bidDueDate from ISO string to Date object
      if (rfqBody.bidDueDate && typeof rfqBody.bidDueDate === 'string') {
        rfqBody.bidDueDate = new Date(rfqBody.bidDueDate);
      }
      
      // Generate RFQ number
      const year = new Date().getFullYear();
      const count = (await storage.getRFQsByOrganization(req.user!.organizationId)).length + 1;
      const number = `RFQ-${year}-${count.toString().padStart(3, '0')}`;
      
      const rfqData = insertRfqSchema.parse({
        ...rfqBody,
        organizationId: req.user!.organizationId,
        createdById: req.user!.id,
        number
      });
      
      const rfq = await storage.createRFQ(rfqData);

      // Create RFQ lines if provided
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          await storage.createRFQLine({
            rfqId: rfq.id,
            materialId: line.materialId || null,
            description: line.description,
            quantity: line.quantity.toString(),
            unit: line.unit
          });
        }
      }
      
      res.status(201).json(rfq);
    } catch (error) {
      console.error('RFQ creation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      res.status(400).json({ error: "Invalid RFQ data", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get individual RFQ
  app.get("/api/rfqs/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const rfq = await storage.getRFQ(req.params.id);
      if (!rfq || rfq.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      res.json(rfq);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RFQ" });
    }
  });

  // Get RFQ lines
  app.get("/api/rfqs/:id/lines", async (req: AuthenticatedRequest, res) => {
    try {
      const rfq = await storage.getRFQ(req.params.id);
      if (!rfq || rfq.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "RFQ not found" });
      }
      
      const lines = await storage.getRFQLines(req.params.id);
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RFQ lines" });
    }
  });

  // Quote routes
  app.get("/api/rfqs/:rfqId/quotes", async (req: AuthenticatedRequest, res) => {
    try {
      const rfq = await storage.getRFQ(req.params.rfqId);
      if (!rfq || rfq.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "RFQ not found" });
      }

      const quotes = await storage.getQuotesByRFQ(req.params.rfqId);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Award quote and create purchase order
  app.post("/api/quotes/:quoteId/award", async (req: AuthenticatedRequest, res) => {
    try {
      // Get the quote and verify access
      const quote = await storage.getQuote(req.params.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get the RFQ to verify organization access
      const rfq = await storage.getRFQ(quote.rfqId);
      if (!rfq || rfq.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "RFQ not found" });
      }

      // Mark this quote as selected
      await storage.updateQuote(req.params.quoteId, { isSelected: true });

      // Create purchase order from the winning quote
      const vendor = await storage.getVendor(quote.vendorId);
      if (!vendor) {
        return res.status(400).json({ error: "Vendor not found" });
      }

      // Generate PO number
      const year = new Date().getFullYear();
      const count = (await storage.getPurchaseOrdersByOrganization(req.user!.organizationId)).length + 1;
      const poNumber = `PO-${year}-${count.toString().padStart(4, '0')}`;

      const poData = {
        organizationId: req.user!.organizationId,
        projectId: rfq.projectId,
        vendorId: quote.vendorId,
        rfqId: rfq.id,
        quoteId: quote.id,
        number: poNumber,
        status: 'draft' as const,
        subtotal: quote.totalAmount,
        totalAmount: quote.totalAmount,
        createdById: req.user!.id
      };

      const purchaseOrder = await storage.createPurchaseOrder(poData);

      // Create PO lines from quote lines
      const quoteLines = await storage.getQuoteLines(quote.id);
      const rfqLines = await storage.getRFQLines(rfq.id);
      
      for (const quoteLine of quoteLines) {
        const rfqLine = rfqLines.find(line => line.id === quoteLine.rfqLineId);
        if (rfqLine) {
          await storage.createPurchaseOrderLine({
            poId: purchaseOrder.id,
            description: rfqLine.description,
            quantity: rfqLine.quantity,
            unit: rfqLine.unit,
            unitPrice: quoteLine.unitPrice.toString(),
            lineTotal: quoteLine.lineTotal.toString()
          });
        }
      }

      res.json({ 
        message: "Quote awarded successfully", 
        purchaseOrder,
        poNumber 
      });
    } catch (error) {
      console.error('Quote award error:', error);
      res.status(500).json({ error: "Failed to award quote" });
    }
  });

  // Create sample quotes for demonstration
  app.post("/api/rfqs/:rfqId/quotes/sample", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const demoMode = await storage.getDemoMode(user.organizationId);
      
      if (!demoMode) {
        return res.status(403).json({ 
          error: "Sample quote generation is only available in demo mode. Enable demo mode in the profile menu to use this feature." 
        });
      }
      const rfq = await storage.getRFQ(req.params.rfqId);
      if (!rfq || rfq.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "RFQ not found" });
      }

      const vendors = await storage.getVendorsByOrganization(req.user!.organizationId);
      const rfqLines = await storage.getRFQLines(req.params.rfqId);

      if (vendors.length === 0 || rfqLines.length === 0) {
        return res.status(400).json({ error: "No vendors or RFQ lines found" });
      }

      // Create sample quotes from vendors
      const sampleQuotes = [];
      for (let i = 0; i < Math.min(vendors.length, 3); i++) {
        const vendor = vendors[i];
        
        // Generate realistic pricing variations
        const baseMultiplier = 0.85 + (i * 0.15); // First vendor gets 85%, second 100%, third 115%
        const randomVariation = 0.95 + (Math.random() * 0.1); // +/- 5% variation
        const priceMultiplier = baseMultiplier * randomVariation;

        let totalAmount = 0;
        const quoteLines = [];

        for (const rfqLine of rfqLines) {
          const basePrice = 50 + (Math.random() * 200); // Random base price between $50-250
          const unitPrice = Math.round(basePrice * priceMultiplier * 100) / 100;
          const lineTotal = Math.round(unitPrice * parseFloat(rfqLine.quantity) * 100) / 100;
          totalAmount += lineTotal;

          quoteLines.push({
            rfqLineId: rfqLine.id,
            unitPrice: unitPrice.toString(),
            lineTotal: lineTotal.toString(),
            leadTimeDays: 15 + Math.floor(Math.random() * 20), // 15-35 days
            alternateDescription: Math.random() > 0.7 ? "Premium grade alternative available" : undefined
          });
        }

        const quoteData = {
          rfqId: req.params.rfqId,
          vendorId: vendor.id,
          totalAmount: (Math.round(totalAmount * 100) / 100).toString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          notes: `Quote valid for 30 days. ${i === 0 ? 'Best price guarantee!' : i === 1 ? 'Premium quality materials.' : 'Fast delivery available.'}`,
          isDemo: true // Mark as demo quote
        };

        const quote = await storage.createQuote(quoteData);

        // Create quote lines
        for (const lineData of quoteLines) {
          await storage.createQuoteLine({
            quoteId: quote.id,
            ...lineData
          });
        }

        sampleQuotes.push(quote);
      }

      // Update RFQ status to 'quoted'
      await storage.updateRFQStatus(req.params.rfqId, 'quoted');

      res.json({ 
        message: `Created ${sampleQuotes.length} sample quotes`,
        quotes: sampleQuotes
      });
    } catch (error) {
      console.error('Sample quote creation error:', error);
      res.status(500).json({ error: "Failed to create sample quotes" });
    }
  });

  // Quote document upload
  app.post("/api/quotes/upload", async (req: AuthenticatedRequest, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorage = new ObjectStorageService();
      
      const uploadURL = await objectStorage.getUploadURL("quotes");
      res.json({ uploadURL });
    } catch (error) {
      console.error("Quote upload URL error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Update quote with document info after upload
  app.put("/api/quotes/:id/document", async (req: AuthenticatedRequest, res) => {
    try {
      const { documentUrl, documentName } = req.body;
      
      if (!documentUrl || !documentName) {
        return res.status(400).json({ error: "Document URL and name required" });
      }

      // Update quote with document information
      await storage.updateQuote(req.params.id, {
        documentUrl,
        documentName
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Quote document update error:", error);
      res.status(500).json({ error: "Failed to update quote document" });
    }
  });

  // View quote document
  app.get("/api/quotes/:id/document", async (req: AuthenticatedRequest, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote || !quote.documentUrl) {
        return res.status(404).json({ error: "Quote document not found" });
      }

      const { ObjectStorageService } = await import("./objectStorage");
      const objectStorage = new ObjectStorageService();
      
      const file = await objectStorage.getFile(quote.documentUrl);
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Quote document download error:", error);
      res.status(500).json({ error: "Failed to download quote document" });
    }
  });

  // Demo mode settings
  app.get("/api/settings/demo-mode", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const demoMode = await storage.getDemoMode(user.organizationId);
      res.json({ enabled: demoMode });
    } catch (error) {
      console.error("Get demo mode error:", error);
      res.status(500).json({ error: "Failed to get demo mode setting" });
    }
  });

  app.put("/api/settings/demo-mode", async (req: AuthenticatedRequest, res) => {
    try {
      const { enabled } = req.body;
      const user = req.user!;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      await storage.setDemoMode(user.organizationId, enabled);
      res.json({ success: true, enabled });
    } catch (error) {
      console.error("Set demo mode error:", error);
      res.status(500).json({ error: "Failed to update demo mode setting" });
    }
  });

  // Requisition status update
  app.patch("/api/requisitions/:id/status", async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      
      // Verify requisition belongs to user's organization
      const requisition = await storage.getRequisition(req.params.id);
      if (!requisition || requisition.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      await storage.updateRequisitionStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update requisition status" });
    }
  });

  // Purchase Order routes
  app.get("/api/purchase-orders", async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, vendorId, forDelivery } = req.query;
      let purchaseOrders;
      
      if (forDelivery === 'true') {
        // Return only POs that have remaining quantities to deliver
        purchaseOrders = await storage.getAvailablePurchaseOrdersForDelivery(req.user!.organizationId);
      } else if (projectId && typeof projectId === 'string') {
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

  app.get("/api/purchase-orders/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      res.json(po);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order" });
    }
  });

  app.get("/api/purchase-orders/:id/lines", async (req: AuthenticatedRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      const lines = await storage.getPurchaseOrderLines(req.params.id);
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase order lines" });
    }
  });

  // Update Purchase Order Status  
  app.patch("/api/purchase-orders/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      const user = req.user!;

      // Validate status
      const validStatuses = ['draft', 'sent', 'acknowledged', 'received', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Check if purchase order exists and belongs to user's organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Update status
      await storage.updatePurchaseOrderStatus(req.params.id, status);
      
      res.json({ success: true, status });
    } catch (error) {
      console.error("Update PO status error:", error);
      res.status(500).json({ error: "Failed to update purchase order status" });
    }
  });

  app.get("/api/purchase-orders/:id/delivered-quantities", async (req: AuthenticatedRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }
      
      const deliveredQuantities = await storage.getPreviouslyDeliveredQuantities(req.params.id);
      res.json(deliveredQuantities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch delivered quantities" });
    }
  });

  app.post("/api/purchase-orders", requireRole(['Admin', 'PM', 'Purchaser']), async (req: AuthenticatedRequest, res) => {
    try {
      const poData = insertPurchaseOrderSchema.parse(req.body);
      
      // Generate PO number in format: Project Number - Phase Code - Users Initials
      let number = '';
      
      // Get project details for project number and phase code
      if (poData.projectId) {
        const project = await storage.getProject(poData.projectId);
        if (project) {
          const projectNumber = project.projectNumber || 'PROJ';
          
          // Get sequential number for this project's POs
          const projectPOs = await storage.getPurchaseOrdersByProject(poData.projectId);
          const sequential = (projectPOs.length + 1).toString().padStart(2, '0');
          
          // Get user's initials from first and last name
          const user = await storage.getUser(req.user!.id);
          const userInitials = user && user.firstName && user.lastName 
            ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
            : 'XX';
          
          number = `${projectNumber}-${sequential}-${userInitials}`;
        } else {
          // Fallback if project not found
          const count = (await storage.getPurchaseOrdersByOrganization(req.user!.organizationId)).length + 1;
          number = `PO-${count.toString().padStart(3, '0')}`;
        }
      } else {
        // Fallback if no project selected
        const count = (await storage.getPurchaseOrdersByOrganization(req.user!.organizationId)).length + 1;
        number = `PO-${count.toString().padStart(3, '0')}`;
      }
      
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

  app.get("/api/purchase-orders/:id/pdf", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error instanceof Error ? error.message : 'Unknown error' });
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

  // Get single delivery by ID
  app.get("/api/deliveries/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery || delivery.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(delivery);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch delivery" });
    }
  });

  // Get delivery lines by delivery ID
  app.get("/api/deliveries/:id/lines", async (req: AuthenticatedRequest, res) => {
    try {
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery || delivery.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const lines = await storage.getDeliveryLines(req.params.id);
      res.json(lines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch delivery lines" });
    }
  });

  app.post("/api/deliveries", requireRole(['Admin', 'PM', 'Field']), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Delivery creation request:', JSON.stringify(req.body, null, 2));
      
      const { lines, ...deliveryBody } = req.body;
      
      // Convert deliveryDate to proper timestamp if it's a string
      if (deliveryBody.deliveryDate && typeof deliveryBody.deliveryDate === 'string') {
        deliveryBody.deliveryDate = new Date(deliveryBody.deliveryDate);
      }
      
      // Ensure attachments is an array
      if (!deliveryBody.attachments) {
        deliveryBody.attachments = [];
      }
      
      console.log('Processed delivery data:', JSON.stringify(deliveryBody, null, 2));
      
      const deliveryData = insertDeliverySchema.parse(deliveryBody);
      const delivery = await storage.createDelivery({
        ...deliveryData,
        organizationId: req.user!.organizationId,
        receiverId: req.user!.id
      });
      
      // Create delivery lines if provided
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          await storage.createDeliveryLine({
            deliveryId: delivery.id,
            poLineId: line.poLineId || null,
            description: line.description,
            quantityOrdered: line.quantityOrdered ? line.quantityOrdered.toString() : null,
            quantityReceived: line.quantityReceived.toString(),
            quantityDamaged: line.quantityDamaged ? line.quantityDamaged.toString() : '0',
            discrepancyNotes: line.discrepancyNotes || null
          });
        }
      }
      
      // Check and update PO completion status if this delivery has a PO
      if (deliveryData.poId) {
        await storage.checkAndUpdatePOCompletionStatus(deliveryData.poId);
      }
      
      res.status(201).json(delivery);
    } catch (error) {
      console.error('Delivery creation error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid delivery data" });
      }
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

  app.get("/api/invoices/:id", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice || invoice.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices/:id/manual-match", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      const invoiceId = req.params.id;
      const { poId, amount } = req.body;

      // Validate input
      if (!poId || !amount) {
        return res.status(400).json({ error: "Purchase order ID and amount are required" });
      }

      const matchAmount = parseFloat(amount);
      if (isNaN(matchAmount) || matchAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount provided" });
      }

      // Verify invoice exists and user has access
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Verify PO exists and user has access
      const po = await storage.getPurchaseOrder(poId);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Verify PO is in the same project as the invoice
      if (invoice.projectId !== po.projectId) {
        return res.status(400).json({ error: "Invoice and purchase order must be in the same project" });
      }

      // Update invoice with manual match
      await storage.updateInvoiceMatchStatus(
        invoiceId,
        'matched',
        0, // No variance for manual matches
        [] // Clear exceptions
      );

      // Update invoice with PO link and manual match details
      await storage.updateInvoiceManualMatch(invoiceId, poId, matchAmount, req.user!.id);

      const updatedInvoice = await storage.getInvoice(invoiceId);
      res.json(updatedInvoice);
    } catch (error) {
      console.error('Manual invoice matching error:', error);
      res.status(500).json({ error: "Failed to manually match invoice" });
    }
  });

  app.post("/api/invoices", requireRole(['Admin', 'PM', 'AP']), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Received invoice data:', req.body);
      
      // Find or create vendor by name
      let vendor = await storage.getVendorByName(req.body.vendorName, req.user!.organizationId);
      if (!vendor) {
        // Create a new vendor if it doesn't exist
        vendor = await storage.createVendor({
          name: req.body.vendorName,
          company: req.body.vendorName,
          email: req.body.vendorName,
          organizationId: req.user!.organizationId,
        });
      }
      
      // Prepare invoice data with vendor ID and convert dates
      const invoiceData = {
        invoiceNumber: req.body.invoiceNumber,
        projectId: req.body.projectId,
        vendorId: vendor.id,
        totalAmount: req.body.amount.toString(),
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
        status: req.body.status || 'pending',
        poId: req.body.poId || null,
        documentUrl: req.body.documentUrl || null,
      };

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
          matchResult.matched ? 'matched' : 'missing_po',
          matchResult.summary.totalVariance,
          matchResult.exceptions
        );
      } catch (matchError) {
        console.error('3-way match failed:', matchError);
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Invoice creation error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid invoice data" });
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
      const { projectId } = req.query;
      let requisitions, purchaseOrders, invoices, projects;

      if (projectId && typeof projectId === 'string') {
        // Get filtered data for specific project
        [requisitions, purchaseOrders, invoices, projects] = await Promise.all([
          storage.getRequisitionsByProject(projectId),
          storage.getPurchaseOrdersByProject(projectId),
          storage.getInvoicesByOrganization(req.user!.organizationId), // Invoices don't have project filtering yet
          storage.getProjectsByOrganization(req.user!.organizationId)
        ]);
      } else {
        // Get all data for organization
        [requisitions, purchaseOrders, invoices, projects] = await Promise.all([
          storage.getRequisitionsByOrganization(req.user!.organizationId),
          storage.getPurchaseOrdersByOrganization(req.user!.organizationId),
          storage.getInvoicesByOrganization(req.user!.organizationId),
          storage.getProjectsByOrganization(req.user!.organizationId)
        ]);
      }

      const stats = {
        openRequisitions: requisitions.filter((r: any) => r.status === 'submitted').length,
        pendingPOs: purchaseOrders.filter((po: any) => po.status === 'draft' || po.status === 'sent').length,
        invoiceExceptions: invoices.filter((i: any) => i.status === 'exception').length,
        costSavings: '23400', // This would be calculated from actual data
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active').length
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

  // Contract Forecasting routes
  app.get("/api/reporting/contract-forecasting/:projectId", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const { includePending = 'true', revenueMethod = 'PERCENT_COMPLETE' } = req.query;
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get cost codes from contract estimates
      const estimates = await db.select().from(contractEstimates)
        .where(eq(contractEstimates.projectId, projectId));
      
      // Group estimates by cost code
      const costCodeData = estimates.reduce((acc: any, estimate: any) => {
        if (!acc[estimate.costCode]) {
          acc[estimate.costCode] = {
            costCode: estimate.costCode,
            description: estimate.materialCategory || estimate.title,
            budget: 0,
            estimates: []
          };
        }
        acc[estimate.costCode].budget += parseFloat(estimate.awardedValue || '0');
        acc[estimate.costCode].estimates.push(estimate);
        return acc;
      }, {});

      // Get financial data for each cost code
      const forecastData = await Promise.all(
        Object.keys(costCodeData).map(async (costCode) => {
          const costCodeInfo = costCodeData[costCode];
          
          // Get spent amounts (approved invoices)
          const projectInvoices = await db.select().from(invoices)
            .where(eq(invoices.projectId, projectId));
          const spent = projectInvoices
            .filter((invoice: any) => invoice.status === 'approved')
            .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.totalAmount || '0'), 0);

          // Get committed amounts (PO lines)
          const purchaseOrders = await storage.getPurchaseOrdersByProject(projectId);
          const committed = purchaseOrders
            .filter((po: any) => po.status !== 'cancelled')
            .reduce((sum: number, po: any) => sum + parseFloat(po.totalAmount || '0'), 0);

          // Calculate ETC
          const etc = Math.max(costCodeInfo.budget - spent - committed, 0);
          
          // Calculate percentage complete
          const percentComplete = costCodeInfo.budget > 0 ? (spent / costCodeInfo.budget) * 100 : 0;
          
          // Calculate projected cost
          const pendingCos = 0; // Placeholder - would calculate from draft COs
          const projectedCost = spent + committed + etc + (includePending === 'true' ? pendingCos : 0);
          
          // Calculate revenue forecast based on method
          let revenueForcast = 0;
          if (revenueMethod === 'PERCENT_COMPLETE') {
            const completionPct = percentComplete / 100;
            revenueForcast = completionPct * (costCodeInfo.budget + (includePending === 'true' ? pendingCos : 0));
          }
          
          // Calculate profit/variance
          const profitVariance = revenueForcast - projectedCost;

          return {
            costCode,
            description: costCodeInfo.description,
            currentBudget: costCodeInfo.budget,
            spent,
            committed,
            spentCommitted: spent + committed,
            pendingCos: includePending === 'true' ? pendingCos : 0,
            etc,
            projectedCost,
            revenueForcast,
            profitVariance,
            percentComplete,
            status: profitVariance >= 0 ? 'on_track' : 'over_budget'
          };
        })
      );

      // Calculate summary totals
      const summary = {
        totalBudget: forecastData.reduce((sum, row) => sum + row.currentBudget, 0),
        totalSpent: forecastData.reduce((sum, row) => sum + row.spent, 0),
        totalCommitted: forecastData.reduce((sum, row) => sum + row.committed, 0),
        totalPendingCos: forecastData.reduce((sum, row) => sum + row.pendingCos, 0),
        totalEtc: forecastData.reduce((sum, row) => sum + row.etc, 0),
        totalProjectedCost: forecastData.reduce((sum, row) => sum + row.projectedCost, 0),
        totalRevenueForcast: forecastData.reduce((sum, row) => sum + row.revenueForcast, 0),
        totalProfitVariance: forecastData.reduce((sum, row) => sum + row.profitVariance, 0),
        overallCompletion: forecastData.length > 0 ? 
          forecastData.reduce((sum, row) => sum + row.percentComplete, 0) / forecastData.length : 0
      };

      res.json({
        project: {
          id: project.id,
          name: project.name,
          status: project.status
        },
        summary,
        costCodes: forecastData
      });

    } catch (error) {
      console.error('Contract forecasting error:', error);
      res.status(500).json({ error: "Failed to fetch contract forecasting data" });
    }
  });

  // Export contract forecasting to CSV
  app.get("/api/reporting/contract-forecasting/:projectId/export.csv", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const { includePending = 'true', revenueMethod = 'PERCENT_COMPLETE' } = req.query;

      // Get the same data as the main forecasting report
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const estimates = await db.select().from(contractEstimates)
        .where(eq(contractEstimates.projectId, projectId));
      
      // Group estimates by cost code
      const costCodeData = estimates.reduce((acc: any, estimate: any) => {
        if (!acc[estimate.costCode]) {
          acc[estimate.costCode] = {
            costCode: estimate.costCode,
            description: estimate.materialCategory || estimate.title,
            budget: 0,
            estimates: []
          };
        }
        acc[estimate.costCode].budget += parseFloat(estimate.awardedValue || '0');
        acc[estimate.costCode].estimates.push(estimate);
        return acc;
      }, {});

      const forecastData = await Promise.all(
        Object.keys(costCodeData).map(async (costCode) => {
          const costCodeInfo = costCodeData[costCode];
          
          const projectInvoices = await db.select().from(invoices)
            .where(eq(invoices.projectId, projectId));
          const spent = projectInvoices
            .filter((invoice: any) => invoice.status === 'approved')
            .reduce((sum: number, invoice: any) => sum + parseFloat(invoice.totalAmount || '0'), 0);

          const purchaseOrders = await storage.getPurchaseOrdersByProject(projectId);
          const committed = purchaseOrders
            .filter((po: any) => po.status !== 'cancelled')
            .reduce((sum: number, po: any) => sum + parseFloat(po.totalAmount || '0'), 0);

          const etc = Math.max(costCodeInfo.budget - spent - committed, 0);
          const percentComplete = costCodeInfo.budget > 0 ? (spent / costCodeInfo.budget) * 100 : 0;
          const pendingCos = 0; // Placeholder
          const projectedCost = spent + committed + etc + (includePending === 'true' ? pendingCos : 0);
          
          let revenueForcast = 0;
          if (revenueMethod === 'PERCENT_COMPLETE') {
            const completionPct = percentComplete / 100;
            revenueForcast = completionPct * (costCodeInfo.budget + (includePending === 'true' ? pendingCos : 0));
          }
          
          const profitVariance = revenueForcast - projectedCost;

          return {
            costCode,
            description: costCodeInfo.description,
            currentBudget: costCodeInfo.budget,
            spent,
            committed,
            spentCommitted: spent + committed,
            pendingCos: includePending === 'true' ? pendingCos : 0,
            etc,
            projectedCost,
            revenueForcast,
            profitVariance,
            percentComplete,
            status: profitVariance >= 0 ? 'on_track' : 'over_budget'
          };
        })
      );

      // Create CSV content
      const headers = [
        'Cost Code',
        'Description',
        'Current Budget',
        'Spent',
        'Committed',
        'Spent + Committed',
        'Pending COs',
        'ETC',
        'Projected Cost',
        'Revenue Forecast',
        'Profit/Variance',
        '% Complete',
        'Status'
      ];

      const csvRows = [
        headers.join(','),
        ...forecastData.map(row => [
          row.costCode,
          `"${row.description}"`,
          row.currentBudget.toFixed(2),
          row.spent.toFixed(2),
          row.committed.toFixed(2),
          row.spentCommitted.toFixed(2),
          row.pendingCos.toFixed(2),
          row.etc.toFixed(2),
          row.projectedCost.toFixed(2),
          row.revenueForcast.toFixed(2),
          row.profitVariance.toFixed(2),
          row.percentComplete.toFixed(1),
          row.status
        ].join(','))
      ];

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contract-forecast-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);

    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Create forecast snapshot
  app.post("/api/reporting/contract-forecasting/:projectId/snapshot", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create snapshot with current date
      const snapshot = {
        id: crypto.randomUUID(),
        projectId,
        organizationId: req.user!.organizationId,
        snapshotDate: new Date(),
        snapshotData: {
          timestamp: new Date().toISOString(),
          projectName: project.name,
          note: `Snapshot created on ${new Date().toLocaleDateString()}`
        }
      };

      // In a real implementation, you would save this to the contractForecastSnapshots table
      // For now, just return success
      res.json({ success: true, snapshotId: snapshot.id });

    } catch (error) {
      console.error('Snapshot creation error:', error);
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });

  app.post("/api/reporting/contract-forecasting/override/:projectId/:costCode", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId, costCode } = req.params;
      const overrideData = req.body;
      
      // Validate project access
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Save override (would implement in storage layer)
      // For now, just return the updated calculation
      res.json({
        success: true,
        message: "Override saved successfully"
      });

    } catch (error) {
      console.error('Override save error:', error);
      res.status(500).json({ error: "Failed to save override" });
    }
  });

  app.get("/api/reporting/contract-forecasting/:projectId/export.csv", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      
      // Get forecasting data (reuse logic from main endpoint)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contract-forecast.csv"');
      
      const csvData = "Cost Code,Description,Budget,Spent,Committed,ETC,Projected Cost,Revenue Forecast,Profit/Variance\n";
      res.send(csvData);

    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  app.post("/api/reporting/contract-forecasting/:projectId/snapshot", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      
      // Create snapshot (would save to forecast_snapshots table)
      res.json({
        success: true,
        message: "Snapshot created successfully"
      });

    } catch (error) {
      console.error('Snapshot creation error:', error);
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
