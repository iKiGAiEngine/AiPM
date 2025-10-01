import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { jobScheduler } from "./jobs";
import { storage } from "./storage";
import { hashPassword } from "./middleware/auth";
import type { InsertOrganization, InsertUser } from "@shared/schema";
import { db } from "./db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Auto-seed production database on startup if admin doesn't exist
async function autoSeedProduction() {
  try {
    // Only run auto-seed in production or when explicitly enabled
    if (app.get("env") === "development" && !process.env.ENABLE_AUTO_SEED) {
      return;
    }

    const adminEmail = process.env.AIPM_ADMIN_EMAIL;
    const adminPassword = process.env.AIPM_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      // No admin credentials configured, skip auto-seed
      return;
    }

    // Check if admin user already exists
    const existingUser = await storage.getUserByEmail(adminEmail);
    if (existingUser) {
      // Admin already exists, no action needed
      return;
    }

    console.log('🔄 Auto-seeding: Admin user not found, creating...');
    console.log(`📧 Admin email: ${adminEmail}`);

    // Get or create organization
    const domain = adminEmail.split('@')[1];
    let organization;

    try {
      const orgName = domain?.split('.')[0] || 'Default';
      const capitalizedOrgName = orgName.charAt(0).toUpperCase() + orgName.slice(1);

      const org: InsertOrganization = {
        name: `${capitalizedOrgName} Construction`,
        domain: domain,
        settings: {
          tolerances: {
            pricePercentage: 2.0,
            quantityPercentage: 1.0,
            taxFreightCap: 50.0
          },
          defaultSettings: {
            usepeenedGrabBars: false,
            currency: "USD",
            timezone: "America/New_York"
          }
        },
        demoMode: false
      };

      organization = await storage.createOrganization(org);
      console.log(`✅ Created organization: ${organization.name}`);
    } catch (error: any) {
      if (error?.code === '23505') {
        // Organization exists, fetch it
        const [existingOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.domain, domain))
          .limit(1);
        
        if (existingOrg) {
          organization = existingOrg;
          console.log(`✅ Using existing organization: ${organization.name}`);
        } else {
          throw new Error("Organization conflict but not found");
        }
      } else {
        throw error;
      }
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const adminUser: InsertUser = {
      email: adminEmail,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "Admin",
      organizationId: organization.id,
      isActive: true
    };

    try {
      await storage.createUser(adminUser);
      console.log(`✅ Auto-seed complete: Admin user created`);
    } catch (userError: any) {
      // Handle concurrent creation - if user already exists from parallel startup, treat as success
      if (userError?.code === '23505') {
        console.log(`✅ Auto-seed: Admin user already exists (created by concurrent process)`);
      } else {
        throw userError;
      }
    }
  } catch (error) {
    console.error('❌ Auto-seed failed:', error);
    // Don't crash the server, just log the error
  }
}

(async () => {
  const server = await registerRoutes(app);

  // Run auto-seed before starting server
  await autoSeedProduction();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    
    // Only throw in development to see stack traces, prevent crash loops in production
    if (app.get("env") === "development") {
      throw err;
    } else {
      console.error('Error handled:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    console.log(`✓ Server successfully started on http://0.0.0.0:${port}`);
  }).on('error', (err: NodeJS.ErrnoException) => {
    console.error('Failed to start server:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
})();
