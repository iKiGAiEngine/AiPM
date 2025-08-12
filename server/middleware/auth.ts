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

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user as any;
    next();
  });
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const roleHierarchy = {
      'Admin': 5,
      'PM': 4,
      'Purchaser': 3,
      'AP': 2,
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
