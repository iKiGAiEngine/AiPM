import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-change-in-production";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(user: { id: string; email: string; organizationId: string; role: string }) {
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      organizationId: user.organizationId,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth check for:', req.method, req.path);
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token found');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    const payload = decoded as any;
    req.user = {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role
    };
    console.log('Token verified for user:', payload.email);
    next();
  });
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const roleHierarchy = {
      'Admin': 6,
      'President': 5,
      'PM': 4,
      'Project Coordinator': 3,
      'Purchaser': 2,
      'AP': 1,
      'Field': 1
    };

    const userRoleLevel = roleHierarchy[req.user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = Math.min(...roles.map(role => roleHierarchy[role as keyof typeof roleHierarchy] || 0));

    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.organizationId) {
    return res.status(403).json({ error: 'Organization access required' });
  }
  next();
}

export function requireProjectAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const projectId = req.headers['x-selected-project-id'] as string;
  if (!projectId) {
    return res.status(400).json({ error: 'Project context required - no project selected' });
  }

  // Store project ID in request for use by route handlers
  (req as any).selectedProjectId = projectId;
  next();
}

export async function validateProjectOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Extract resource ID from various possible parameter names
    const resourceId = req.params.id || req.params.requisitionId || req.params.rfqId || req.params.poId;
    
    if (!resourceId) {
      return next(); // Skip validation if no resource ID
    }

    // Determine resource type from the route path
    const path = req.route?.path || req.path;
    let resource = null;
    
    if (path.includes('/requisitions/')) {
      resource = await storage.getRequisition(resourceId);
    } else if (path.includes('/rfqs/')) {
      resource = await storage.getRFQ(resourceId);
    } else if (path.includes('/purchase-orders/')) {
      resource = await storage.getPurchaseOrder(resourceId);
    } else if (path.includes('/deliveries/')) {
      resource = await storage.getDelivery(resourceId);
    } else if (path.includes('/invoices/')) {
      resource = await storage.getInvoice(resourceId);
    }

    if (resource) {
      // Check organization ownership first
      if (resource.organizationId !== req.user.organizationId) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check project context if a project is selected
      const selectedProjectId = req.headers['x-selected-project-id'] as string;
      if (selectedProjectId && resource.projectId && resource.projectId !== selectedProjectId) {
        return res.status(403).json({ error: 'Resource not accessible in current project context' });
      }
    }

    next();
  } catch (error) {
    console.error('Project ownership validation error:', error);
    res.status(500).json({ error: 'Failed to validate resource access' });
  }
}
