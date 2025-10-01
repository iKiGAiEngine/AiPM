import { storage } from "./storage";
import { hashPassword } from "./middleware/auth";
import type { InsertOrganization, InsertUser } from "@shared/schema";
import { db } from "./db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedProduction() {
  try {
    console.log("🚀 Starting production database initialization...");

    const adminEmail = process.env.AIPM_ADMIN_EMAIL;
    const adminPassword = process.env.AIPM_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("❌ Missing required environment variables:");
      console.error("   - AIPM_ADMIN_EMAIL");
      console.error("   - AIPM_ADMIN_PASSWORD");
      console.error("\nPlease set these secrets in your deployment configuration.");
      process.exit(1);
    }

    console.log(`📧 Admin email: ${adminEmail}`);

    // Check if admin user already exists
    const existingUser = await storage.getUserByEmail(adminEmail);
    if (existingUser) {
      console.log("✅ Admin user already exists - skipping creation");
      console.log("🎉 Production database is ready!");
      return;
    }

    // Get or create organization
    const domain = adminEmail.split('@')[1];
    let organization;

    try {
      // Try to create a new organization
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
      // If organization already exists (unique constraint violation), fetch it
      if (error?.code === '23505') {
        console.log("✅ Organization already exists - using existing");
        // Query for existing organization by domain
        const [existingOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.domain, domain))
          .limit(1);
        
        if (existingOrg) {
          organization = existingOrg;
        } else {
          throw new Error("Organization conflict error but could not find existing organization by domain");
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

    const createdUser = await storage.createUser(adminUser);
    console.log(`✅ Created admin user: ${createdUser.email}`);

    console.log("\n🎉 Production database initialized successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`Email: ${adminEmail}`);
    console.log("Password: [from AIPM_ADMIN_PASSWORD secret]");

  } catch (error) {
    console.error("❌ Production seeding failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
seedProduction()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { seedProduction };
