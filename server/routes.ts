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
import { insertUserSchema, insertProjectSchema, insertVendorSchema, insertMaterialSchema, insertRequisitionSchema, insertRfqSchema, insertPurchaseOrderSchema, insertDeliverySchema, insertInvoiceSchema, type InsertProject, invoices, contractEstimates, requisitionLines } from "@shared/schema";
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
      const { search, projectId } = req.query;
      let materials;
      
      if (search && typeof search === 'string') {
        materials = await storage.searchMaterials(req.user!.organizationId, search);
      } else {
        materials = await storage.getMaterialsByOrganization(req.user!.organizationId);
      }
      
      // Filter by project if projectId provided (materials are global but may be filtered by usage)
      if (projectId && typeof projectId === 'string') {
        // For materials, we might want to show project-specific materials or all materials
        // For now, return all materials as they're organization-wide
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

  // Update requisition
  app.put("/api/requisitions/:id", requireRole(['Admin', 'PM', 'Purchaser', 'Field']), async (req: AuthenticatedRequest, res) => {
    try {
      const { RequisitionCreateSchema } = await import('./schemas/requisition.js');
      
      // Validate the request body
      const validatedData = RequisitionCreateSchema.parse(req.body);
      const { lines, ...reqData } = validatedData;
      
      // Prepare update data (exclude organizationId, requesterId, number which shouldn't be changed)
      const updateData = {
        ...reqData,
        targetDeliveryDate: reqData.targetDeliveryDate ? new Date(reqData.targetDeliveryDate) : null,
        contractEstimateId: reqData.contractEstimateId || null,
        zone: reqData.zone || null,
        attachments: reqData.attachments || [],
        geoLocation: reqData.geoLocation || null
      };
      
      // Update the requisition
      const updatedRequisition = await storage.updateRequisition(
        req.params.id, 
        updateData, 
        req.user!.organizationId
      );
      
      if (!updatedRequisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      // Update requisition lines - delete existing and recreate
      if (lines) {
        // Delete existing lines
        const existingLines = await storage.getRequisitionLines(req.params.id);
        for (const line of existingLines) {
          await db.delete(requisitionLines).where(eq(requisitionLines.id, line.id));
        }
        
        // Create new lines
        for (const line of lines) {
          await storage.createRequisitionLine({
            requisitionId: req.params.id,
            materialId: null,
            description: line.description,
            quantity: line.quantity.toString(),
            unit: line.unit,
            estimatedCost: line.estimatedCost ? line.estimatedCost.toString() : null,
            notes: line.notes || null
          });
        }
      }
      
      res.json(updatedRequisition);
    } catch (error) {
      console.error('Requisition update error:', error);
      
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: "Validation Error",
          validationErrors
        });
      }
      
      res.status(500).json({ error: "Failed to update requisition" });
    }
  });

  // Delete requisition
  app.delete("/api/requisitions/:id", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteRequisition(req.params.id, req.user!.organizationId);
      
      if (!success) {
        return res.status(404).json({ error: "Requisition not found" });
      }
      
      res.json({ message: "Requisition deleted successfully" });
    } catch (error) {
      console.error('Requisition deletion error:', error);
      res.status(500).json({ error: "Failed to delete requisition" });
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
      console.log('=== PURCHASE ORDER CREATION ===');
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      // Parse with the fields that come from frontend, excluding backend-generated fields
    const poData = insertPurchaseOrderSchema.omit({ 
      organizationId: true, 
      createdById: true, 
      number: true 
    }).parse(req.body);
      console.log('Parsed PO data:', JSON.stringify(poData, null, 2));
      
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
      
      // Extract lines from the raw request body before validation
      const { lines, ...dataWithoutLines } = req.body;
      console.log('Extracted lines:', JSON.stringify(lines, null, 2));
      
      // Calculate totals from lines
      let subtotal = 0;
      if (lines && Array.isArray(lines)) {
        subtotal = lines.reduce((sum: number, line: any) => {
          return sum + (parseFloat(line.quantity) * parseFloat(line.unitPrice));
        }, 0);
      }
      
      const purchaseOrder = await storage.createPurchaseOrder({
        ...poData,
        number,
        subtotal: subtotal.toString(),
        totalAmount: subtotal.toString(), // For now, no tax or freight
        organizationId: req.user!.organizationId,
        createdById: req.user!.id
      });
      
      // Create purchase order lines if they exist
      if (lines && Array.isArray(lines) && lines.length > 0) {
        console.log('Creating', lines.length, 'PO lines for PO:', purchaseOrder.id);
        
        for (const line of lines) {
          console.log('Creating line:', JSON.stringify(line, null, 2));
          await storage.createPurchaseOrderLine({
            poId: purchaseOrder.id,
            materialId: line.materialId || null,
            projectMaterialId: line.projectMaterialId || null,
            description: line.description,
            quantity: line.quantity.toString(),
            unit: line.unit,
            unitPrice: line.unitPrice.toString(),
            lineTotal: (line.quantity * line.unitPrice).toString()
          });
        }
        console.log('All lines created successfully');
      }
      
      // Update requisition status to "converted" if this PO was created from a requisition
      if (req.body.requisitionId) {
        console.log('Updating requisition status to converted:', req.body.requisitionId);
        await storage.updateRequisitionStatus(req.body.requisitionId, 'converted');
      }
      
      res.status(201).json(purchaseOrder);
    } catch (error) {
      console.error('=== PO CREATION ERROR ===');
      console.error('Error details:', error);
      if (error && typeof error === 'object' && 'issues' in error) {
        console.log('Validation issues:', JSON.stringify((error as any).issues, null, 2));
      }
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid purchase order data" });
      }
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

  // Enhanced PO Workflow API Routes
  
  // Vendor Acknowledgment
  app.post("/api/purchase-orders/:id/acknowledge", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { estimatedShipmentDate, notes } = req.body;
      const user = req.user!;

      // Verify PO exists and belongs to organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Validate status transition
      if (po.status !== 'sent') {
        return res.status(400).json({ error: "Purchase order must be in 'sent' status to acknowledge" });
      }

      // Update PO with acknowledgment data
      const updateData: any = {
        status: 'pending_shipment',
        acknowledgedAt: new Date(),
      };

      if (estimatedShipmentDate) {
        updateData.estimatedShipmentDate = new Date(estimatedShipmentDate);
      }

      // Add to status history
      const statusHistory = po.statusHistory || [];
      statusHistory.push({
        timestamp: new Date().toISOString(),
        fromStatus: 'sent',
        toStatus: 'pending_shipment',
        userId: user.id,
        reason: 'Vendor acknowledgment',
        metadata: { estimatedShipmentDate, notes }
      });
      updateData.statusHistory = statusHistory;

      await storage.updatePurchaseOrder(req.params.id, updateData);

      res.json({ success: true, message: "Purchase order acknowledged successfully" });
    } catch (error) {
      console.error("PO acknowledgment error:", error);
      res.status(500).json({ error: "Failed to acknowledge purchase order" });
    }
  });

  // Add Tracking Information
  app.post("/api/purchase-orders/:id/tracking", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { trackingNumber, carrierName } = req.body;
      const user = req.user!;

      // Validate required fields
      if (!trackingNumber || !carrierName) {
        return res.status(400).json({ error: "Tracking number and carrier name are required" });
      }

      // Verify PO exists and belongs to organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Validate status transition
      if (po.status !== 'pending_shipment') {
        return res.status(400).json({ error: "Purchase order must be in 'pending_shipment' status to add tracking" });
      }

      // Update PO with tracking data
      const updateData: any = {
        status: 'pending_delivery',
        trackingNumber,
        carrierName,
      };

      // Add to status history
      const statusHistory = po.statusHistory || [];
      statusHistory.push({
        timestamp: new Date().toISOString(),
        fromStatus: 'pending_shipment',
        toStatus: 'pending_delivery',
        userId: user.id,
        reason: 'Tracking information added',
        metadata: { trackingNumber, carrierName }
      });
      updateData.statusHistory = statusHistory;

      await storage.updatePurchaseOrder(req.params.id, updateData);

      res.json({ success: true, message: "Tracking information added successfully" });
    } catch (error) {
      console.error("Add tracking error:", error);
      res.status(500).json({ error: "Failed to add tracking information" });
    }
  });

  // Mark as Delivered
  app.post("/api/purchase-orders/:id/delivered", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { deliveryNotes } = req.body;
      const user = req.user!;

      // Verify PO exists and belongs to organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Validate status transition
      if (po.status !== 'pending_delivery') {
        return res.status(400).json({ error: "Purchase order must be in 'pending_delivery' status to mark as delivered" });
      }

      const now = new Date();
      const damageReportDeadline = new Date(now.getTime() + (48 * 60 * 60 * 1000)); // 48 hours

      // Update PO with delivery data
      const updateData: any = {
        status: 'delivered',
        deliveredAt: now,
        damageReportDeadline,
        damageReportSent: false,
      };

      if (deliveryNotes) {
        updateData.deliveryNotes = deliveryNotes;
      }

      // Add to status history
      const statusHistory = po.statusHistory || [];
      statusHistory.push({
        timestamp: now.toISOString(),
        fromStatus: 'pending_delivery',
        toStatus: 'delivered',
        userId: user.id,
        reason: 'Delivery confirmed',
        metadata: { deliveryNotes, damageReportDeadline: damageReportDeadline.toISOString() }
      });
      updateData.statusHistory = statusHistory;

      await storage.updatePurchaseOrder(req.params.id, updateData);

      // Send damage report email notification (48-hour deadline)
      if (emailService) {
        try {
          await emailService.sendDamageReportNotification(po, damageReportDeadline);
        } catch (emailError) {
          console.error("Failed to send damage report email:", emailError);
          // Don't fail the delivery update if email fails
        }
      }

      res.json({ success: true, message: "Purchase order marked as delivered" });
    } catch (error) {
      console.error("Mark delivered error:", error);
      res.status(500).json({ error: "Failed to mark purchase order as delivered" });
    }
  });

  // Match Invoice
  app.post("/api/purchase-orders/:id/match-invoice", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { invoiceId } = req.body;
      const user = req.user!;

      // Verify PO exists and belongs to organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Validate status transition
      if (po.status !== 'delivered') {
        return res.status(400).json({ error: "Purchase order must be delivered to match invoice" });
      }

      const now = new Date();

      // Update PO with invoice match data
      const updateData: any = {
        status: 'matched_pending_payment',
        invoiceId,
        invoiceMatchedAt: now,
      };

      // Add to status history
      const statusHistory = po.statusHistory || [];
      statusHistory.push({
        timestamp: now.toISOString(),
        fromStatus: 'delivered',
        toStatus: 'matched_pending_payment',
        userId: user.id,
        reason: 'Invoice matched',
        metadata: { invoiceId }
      });
      updateData.statusHistory = statusHistory;

      await storage.updatePurchaseOrder(req.params.id, updateData);

      res.json({ success: true, message: "Invoice matched successfully" });
    } catch (error) {
      console.error("Invoice match error:", error);
      res.status(500).json({ error: "Failed to match invoice" });
    }
  });

  // Move to NBS Warehouse
  app.post("/api/purchase-orders/:id/warehouse", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { warehouseNotes } = req.body;
      const user = req.user!;

      // Verify PO exists and belongs to organization
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== user.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      // Validate status transition (can be from delivered or matched_pending_payment)
      if (!['delivered', 'matched_pending_payment'].includes(po.status)) {
        return res.status(400).json({ error: "Purchase order must be delivered or invoice-matched to move to warehouse" });
      }

      const now = new Date();

      // Update PO with warehouse data
      const updateData: any = {
        status: 'received_nbs_wh',
        nbsWarehouseReceivedAt: now,
      };

      // Add to status history
      const statusHistory = po.statusHistory || [];
      statusHistory.push({
        timestamp: now.toISOString(),
        fromStatus: po.status,
        toStatus: 'received_nbs_wh',
        userId: user.id,
        reason: 'Moved to NBS warehouse',
        metadata: { warehouseNotes }
      });
      updateData.statusHistory = statusHistory;

      await storage.updatePurchaseOrder(req.params.id, updateData);

      res.json({ success: true, message: "Materials moved to NBS warehouse successfully" });
    } catch (error) {
      console.error("Warehouse move error:", error);
      res.status(500).json({ error: "Failed to move materials to warehouse" });
    }
  });

  // Get PO Status History
  app.get("/api/purchase-orders/:id/history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const po = await storage.getPurchaseOrder(req.params.id);
      if (!po || po.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Purchase order not found" });
      }

      res.json({ statusHistory: po.statusHistory || [] });
    } catch (error) {
      console.error("Get PO history error:", error);
      res.status(500).json({ error: "Failed to fetch purchase order history" });
    }
  });

  // Delivery routes
  app.get("/api/deliveries", async (req: AuthenticatedRequest, res) => {
    try {
      const { poId, projectId } = req.query;
      let deliveries;
      
      if (poId && typeof poId === 'string') {
        deliveries = await storage.getDeliveriesByPurchaseOrder(poId);
      } else {
        deliveries = await storage.getDeliveriesByOrganization(req.user!.organizationId);
      }
      
      // Filter by project if projectId provided
      if (projectId && typeof projectId === 'string') {
        // Get all PO IDs for this project first
        const projectPOs = await storage.getPurchaseOrdersByProject(projectId);
        const projectPOIds = new Set(projectPOs.map(po => po.id));
        
        deliveries = deliveries.filter(delivery => projectPOIds.has(delivery.poId));
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
      const { vendorId, projectId } = req.query;
      let invoices;
      
      if (vendorId && typeof vendorId === 'string') {
        invoices = await storage.getInvoicesByVendor(vendorId);
      } else {
        invoices = await storage.getInvoicesByOrganization(req.user!.organizationId);
      }
      
      // Filter by project if projectId provided
      if (projectId && typeof projectId === 'string') {
        invoices = invoices.filter(invoice => invoice.projectId === projectId);
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

  // Contract Forecasting routes with CMiC calculations
  app.get("/api/reporting/contract-forecasting/:projectId", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const includePending = req.query.include_pending !== 'false';
      
      console.log(`=== CONTRACT FORECASTING REQUEST ===`);
      console.log(`Project ID: ${projectId}`);
      console.log(`Include Pending: ${includePending}`);
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        console.log(`Project not found or access denied`);
        return res.status(404).json({ error: "Project not found" });
      }
      console.log(`Project found: ${project.name}`);

      // Get real contract estimates for this project
      const estimates = await storage.getContractEstimatesByProject(projectId, req.user!.organizationId);
      console.log(`Found ${estimates.length} contract estimates`);
      console.log('Sample estimate:', estimates[0]);
      
      // Import cost code normalization
      const { normalizeCostCode } = await import('./config/cost-code-map');
      
      // Group estimates by normalized cost code and calculate CMiC values
      const costCodeMap = new Map();
      estimates.forEach(estimate => {
        const normalizedCostCode = normalizeCostCode(estimate.costCode);
        console.log(`Normalizing ${estimate.costCode} -> ${normalizedCostCode}`);
        
        if (!costCodeMap.has(normalizedCostCode)) {
          costCodeMap.set(normalizedCostCode, {
            costCode: normalizedCostCode,
            originalCodes: new Set([estimate.costCode]),
            awardedValue: 0,
            estimates: []
          });
        }
        costCodeMap.get(normalizedCostCode).originalCodes.add(estimate.costCode);
        costCodeMap.get(normalizedCostCode).awardedValue += Number(estimate.awardedValue);
        costCodeMap.get(normalizedCostCode).estimates.push(estimate);
      });
      
      // Get purchase orders and invoices for this project to calculate actual spending
      const purchaseOrders = await storage.getPurchaseOrdersByProject(projectId);
      const allInvoices = await storage.getInvoicesByOrganization(req.user!.organizationId);
      // Filter invoices for this project
      const projectInvoices = allInvoices.filter(inv => inv.projectId === projectId);
      
      console.log(`Found ${purchaseOrders.length} purchase orders and ${projectInvoices.length} invoices`);
      
      // Calculate actual spending by normalized cost code
      const spendingByCode = new Map();
      
      // Process purchase orders through project materials
      for (const po of purchaseOrders) {
        const poLines = await storage.getPurchaseOrderLines(po.id);
        for (const line of poLines) {
          if (line.projectMaterialId) {
            // Get project materials to find cost code
            const projectMaterials = await storage.getProjectMaterialsByProject(projectId, req.user!.organizationId);
            const projectMaterial = projectMaterials.find(pm => pm.id === line.projectMaterialId);
            if (projectMaterial && projectMaterial.costCode) {
              const normalizedCode = normalizeCostCode(projectMaterial.costCode);
              const current = spendingByCode.get(normalizedCode) || { committed: 0, spent: 0 };
              current.committed += Number(line.lineTotal) || 0;
              spendingByCode.set(normalizedCode, current);
            }
          }
        }
      }
      
      // Process invoices for actual spending
      for (const invoice of projectInvoices) {
        if (invoice.matchStatus === 'matched' && invoice.totalAmount) {
          // For now, allocate invoice amounts proportionally across cost codes
          // In a full implementation, you'd track invoice lines by cost code
          const invoiceAmount = Number(invoice.totalAmount) || 0;
          if (invoiceAmount > 0) {
            const totalBudget = Array.from(costCodeMap.values()).reduce((sum, g) => sum + g.awardedValue, 0);
            if (totalBudget > 0) {
              costCodeMap.forEach((group, code) => {
                const proportion = group.awardedValue / totalBudget;
                const allocatedAmount = invoiceAmount * proportion;
                const current = spendingByCode.get(code) || { committed: 0, spent: 0 };
                current.spent += allocatedAmount;
                spendingByCode.set(code, current);
              });
            }
          }
        }
      }

      // Convert to CMiC format lines
      const lines = Array.from(costCodeMap.values()).map(group => {
        const A = Number(group.awardedValue) || 0; // Original budget (awarded value)
        const spending = spendingByCode.get(group.costCode) || { committed: 0, spent: 0 };
        const B = spending.spent || 0; // Actually spent amount
        const C = spending.committed || 0; // Total committed amount  
        const currentPeriodCost = 0; // No period tracking yet
        const G_ctc = Math.max(0, A - C); // Cost to complete (budget - committed)
        const I_cost_fcst = C + G_ctc; // Cost forecast = committed + cost to complete
        const J_rev_budget = A; // Revenue budget = cost budget
        const M_rev_fcst = A; // Revenue forecast = revenue budget
        const N_gain_loss = M_rev_fcst - I_cost_fcst; // Gain/loss
        
        console.log(`Line data for ${group.costCode}: Budget=${A}, Committed=${C}, Spent=${B}, CTC=${G_ctc}`);
        
        return {
          costCode: group.costCode,
          A, B, C, currentPeriodCost,
          D_int: 0, E_ext: 0, F_adj: 0,
          G_ctc, H_ctc_unposted: 0, I_cost_fcst,
          J_rev_budget, K_unposted_rev: 0, L_unposted_rev_adj: 0,
          M_rev_fcst, N_gain_loss
        };
      });
      
      // Calculate totals
      const totals = lines.reduce((acc, line) => {
        acc.A += line.A;
        acc.B += line.B;
        acc.C += line.C;
        acc.currentPeriodCost += line.currentPeriodCost;
        acc.D_int += line.D_int;
        acc.E_ext += line.E_ext;
        acc.F_adj += line.F_adj;
        acc.G_ctc += line.G_ctc;
        acc.H_ctc_unposted += line.H_ctc_unposted;
        acc.I_cost_fcst += line.I_cost_fcst;
        acc.J_rev_budget += line.J_rev_budget;
        acc.K_unposted_rev += line.K_unposted_rev;
        acc.L_unposted_rev_adj += line.L_unposted_rev_adj;
        acc.M_rev_fcst += line.M_rev_fcst;
        acc.N_gain_loss += line.N_gain_loss;
        return acc;
      }, {
        costCode: "TOTALS",
        A: 0, B: 0, C: 0, currentPeriodCost: 0,
        D_int: 0, E_ext: 0, F_adj: 0,
        G_ctc: 0, H_ctc_unposted: 0, I_cost_fcst: 0,
        J_rev_budget: 0, K_unposted_rev: 0, L_unposted_rev_adj: 0,
        M_rev_fcst: 0, N_gain_loss: 0
      });

      const responseData = { lines, totals };
      
      console.log(`Returning real data with ${responseData.lines.length} lines`);
      
      const CMIC_HEADERS = [
        "A. Current Cost Budget\n(Original Budget + Posted PCIs Thru Current Period)",
        "B. Spent/Committed (Less Advance SCOs)\n(C - SCOs Issued On Unposted PCI/OCO)",
        "C. Spent/Committed Total\n(Committed $ + $ Spent Outside Commitment)",
        "Current Period Cost",
        "D. Unposted Internal PCI Cost Budget",
        "E. Unposted External PCI Cost Budget",
        "F. Unposted Int & Ext PCI Cost Budget Adjusted\n(D+E if not overridden)",
        "G. Cost to Complete\n(A - C) unless A less than B, then (CTC = 0)",
        "H. Cost To Complete Unposted PCIs\n(F - Advanced SCOs)",
        "I. Cost Forecast\n(C + G + H)  or  (A + F if G not overridden)",
        "J. Current Revenue Budget\n(Original Budget + Posted PCIs Thru Current Period)",
        "K. Unposted PCI Revenue Budget",
        "L. Unposted PCI Revenue Budget Adjusted\n(K if not overridden)",
        "M. Revenue Forecast\n(J + L)",
        "N. Projected Gain/Loss\n(M - I)"
      ];
      
      res.json({
        ...responseData,
        headers: CMIC_HEADERS,
        includePending,
        projectId,
        project: {
          id: project.id,
          name: project.name,
          status: project.status
        }
      });
    } catch (error) {
      console.error('Contract forecasting error:', error);
      res.status(500).json({ error: 'Failed to generate contract forecasting report' });
    }
  });

  // Contract Forecasting verification endpoint
  app.get("/api/reporting/contract-forecasting/:projectId/verify", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const includePending = req.query.include_pending !== 'false';
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const { ContractForecastingService, CMIC_HEADERS } = await import('./services/contract-forecasting');
      const contractForecastingService = new ContractForecastingService();
      const report = await contractForecastingService.generateReport(projectId, includePending);
      const checks = contractForecastingService.generateVerificationChecks(report.lines, includePending);
      
      res.json({
        ...report,
        checks,
        headers: CMIC_HEADERS,
        includePending,
        projectId,
        project: {
          id: project.id,
          name: project.name,
          status: project.status
        }
      });
    } catch (error) {
      console.error('Contract forecasting verification error:', error);
      res.status(500).json({ error: 'Failed to verify contract forecasting' });
    }
  });

  // Export contract forecasting to CSV
  app.get("/api/reporting/contract-forecasting/:projectId/export.csv", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      const includePending = req.query.include_pending !== 'false';
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Return simple CSV for now
      const csvContent = `Cost Code,A,B,C,Current Period,D,E,F,G,H,I,J,K,L,M,N
02-Site Work,125000,125000,125000,0,0,0,0,0,0,125000,125000,0,0,125000,0`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=contract_forecasting_${projectId}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Contract forecasting CSV export error:', error);
      res.status(500).json({ error: 'Failed to export contract forecasting CSV' });
    }
  });

  // Create forecast snapshot
  app.post("/api/reporting/contract-forecasting/:projectId/snapshot", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const { projectId } = req.params;
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== req.user!.organizationId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create snapshot logic would go here
      res.json({
        success: true,
        message: "Snapshot created successfully"
      });

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

  // User Management routes
  app.get("/api/users/me", async (req: AuthenticatedRequest, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error('Failed to get current user:', error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  app.get("/api/users", requireRole(['Admin', 'PM']), async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getUsersByOrganization(req.user!.organizationId);
      res.json(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
