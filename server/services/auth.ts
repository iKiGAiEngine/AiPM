import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret";

export class AuthService {
  async generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId, email },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateMagicLink(email: string): Promise<string> {
    const token = jwt.sign(
      { email, type: 'magic_link' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/auth/magic?token=${token}`;
  }

  async validateMagicLink(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      
      if (payload.type !== 'magic_link') {
        throw new Error('Invalid token type');
      }

      const user = await storage.getUserByEmail(payload.email);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid or expired magic link');
    }
  }

  hasRole(userRoles: string[], requiredRole: string): boolean {
    const roleHierarchy = {
      'admin': 5,
      'pm': 4,
      'purchaser': 3,
      'ap': 2,
      'field': 1
    };

    const userMaxRole = Math.max(...userRoles.map(role => roleHierarchy[role as keyof typeof roleHierarchy] || 0));
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userMaxRole >= requiredRoleLevel;
  }

  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    // Implementation would fetch user's roles and permissions for the organization
    // For now, return basic permissions
    return ['read', 'write'];
  }
}
