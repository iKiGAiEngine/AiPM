import { storage } from "./storage";
import { hashPassword } from "./middleware/auth";
import type { 
  InsertOrganization, InsertUser, InsertProject, InsertMaterial, InsertVendor 
} from "@shared/schema";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Create demo organization
    const org: InsertOrganization = {
      name: "Metro Construction Group",
      domain: "metro-construction.com",
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
      }
    };

    const organization = await storage.createOrganization(org);
    console.log(`✅ Created organization: ${organization.name}`);

    // Create demo users for each role
    const users = [
      {
        email: "admin@metro-construction.com",
        password: await hashPassword("admin123"),
        firstName: "John",
        lastName: "Admin",
        role: "Admin" as const,
        phone: "(555) 123-4567"
      },
      {
        email: "pm@metro-construction.com", 
        password: await hashPassword("pm123"),
        firstName: "Sarah",
        lastName: "Johnson",
        role: "PM" as const,
        phone: "(555) 234-5678"
      },
      {
        email: "purchaser@metro-construction.com",
        password: await hashPassword("purchaser123"),
        firstName: "Mike",
        lastName: "Chen",
        role: "Purchaser" as const,
        phone: "(555) 345-6789"
      },
      {
        email: "field@metro-construction.com",
        password: await hashPassword("field123"),
        firstName: "David",
        lastName: "Rodriguez",
        role: "Field" as const,
        phone: "(555) 456-7890"
      },
      {
        email: "ap@metro-construction.com",
        password: await hashPassword("ap123"),
        firstName: "Lisa",
        lastName: "Thompson",
        role: "AP" as const,
        phone: "(555) 567-8901"
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = await storage.createUser({
        ...userData,
        organizationId: organization.id
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.role})`);
    }

    // Create demo projects
    const projects = [
      {
        name: "Metro Plaza Office Tower",
        client: "Downtown Development LLC",
        address: "123 Main Street, Downtown, NY 10001",
        status: "active",
        budget: "2500000.00",
        costCodes: ["10-28-00", "10-44-00", "10-55-00"],
        erpIds: { intacct: "PROJ-001" }
      },
      {
        name: "Riverside Medical Center",
        client: "Healthcare Properties Inc",
        address: "456 River Road, Riverside, NY 10002", 
        status: "active",
        budget: "1800000.00",
        costCodes: ["10-28-00", "10-44-00"],
        erpIds: { intacct: "PROJ-002" }
      }
    ];

    const createdProjects = [];
    for (const projectData of projects) {
      const project = await storage.createProject({
        ...projectData,
        organizationId: organization.id
      });
      createdProjects.push(project);
      console.log(`✅ Created project: ${project.name}`);
    }

    // Create vendors focused on Division 10 specialties
    const vendors = [
      {
        name: "ABC Supply Co.",
        company: "ABC Supply Company",
        email: "orders@abcsupply.com",
        phone: "(800) 555-0101",
        address: "1000 Industrial Blvd, Supply City, NY 10003",
        terms: "Net 30",
        deliveryRegions: ["NY", "NJ", "CT"],
        taxRules: { defaultRate: 8.25 },
        ediFlags: true
      },
      {
        name: "Bobrick Hardware",
        company: "Bobrick Washroom Equipment Inc",
        email: "quotes@bobrick.com", 
        phone: "(800) 555-0202",
        address: "2000 Bobrick Way, Hardware City, NY 10004",
        terms: "Net 30",
        deliveryRegions: ["NY", "NJ", "CT", "PA"],
        taxRules: { defaultRate: 8.25 },
        ediFlags: false
      },
      {
        name: "FireSafe Systems",
        company: "FireSafe Protection Systems LLC",
        email: "sales@firesafe.com",
        phone: "(800) 555-0303", 
        address: "3000 Safety Drive, Protection City, NY 10005",
        terms: "Net 45",
        deliveryRegions: ["NY", "NJ"],
        taxRules: { defaultRate: 8.25 },
        ediFlags: true
      },
      {
        name: "Metro Lockers Inc.",
        company: "Metropolitan Locker Systems",
        email: "info@metrolockers.com",
        phone: "(800) 555-0404",
        address: "4000 Locker Lane, Storage City, NY 10006", 
        terms: "Net 30",
        deliveryRegions: ["NY", "NJ", "CT"],
        taxRules: { defaultRate: 8.25 },
        ediFlags: false
      }
    ];

    const createdVendors = [];
    for (const vendorData of vendors) {
      const vendor = await storage.createVendor({
        ...vendorData,
        organizationId: organization.id
      });
      createdVendors.push(vendor);
      console.log(`✅ Created vendor: ${vendor.name}`);
    }

    // Create Division 10 materials catalog
    const materials = [
      // Toilet Accessories (10-28-00)
      {
        sku: "BOB-2888-SS",
        description: "Paper Towel Dispenser, Surface Mount, Stainless Steel",
        manufacturer: "Bobrick",
        model: "B-2888",
        unit: "Each",
        category: "Toilet Accessories",
        finish: "Stainless Steel",
        mounting: "Surface Mount",
        adaFlags: ["ADA Compliant"],
        leadTimeDays: 5,
        lastCost: "142.50",
        minOrderQty: 1,
        substitutable: true,
        ofci: false,
        images: ["https://example.com/bob-2888.jpg"],
        specUrl: "https://bobrick.com/spec/b-2888"
      },
      {
        sku: "BOB-4386-SS", 
        description: "Grab Bar 36\", 1.5\" Diameter, Stainless Steel",
        manufacturer: "Bobrick",
        model: "B-4386",
        unit: "Each",
        category: "Toilet Accessories",
        finish: "Stainless Steel", 
        mounting: "Wall Mount",
        adaFlags: ["ADA Compliant", "Non-Peened"],
        leadTimeDays: 7,
        lastCost: "89.25",
        minOrderQty: 1,
        substitutable: false,
        ofci: true
      },
      {
        sku: "BOB-221-SS",
        description: "Toilet Seat Cover Dispenser, Surface Mount",
        manufacturer: "Bobrick", 
        model: "B-221",
        unit: "Each",
        category: "Toilet Accessories",
        finish: "Stainless Steel",
        mounting: "Surface Mount",
        adaFlags: [],
        leadTimeDays: 3,
        lastCost: "63.25",
        minOrderQty: 1,
        substitutable: true,
        ofci: false
      },
      {
        sku: "BOB-369-SS",
        description: "Waste Receptacle, 13 Gallon, Stainless Steel",
        manufacturer: "Bobrick",
        model: "B-369",
        unit: "Each", 
        category: "Toilet Accessories",
        finish: "Stainless Steel",
        mounting: "Floor Mount",
        adaFlags: ["ADA Compliant"],
        leadTimeDays: 10,
        lastCost: "245.80",
        minOrderQty: 1,
        substitutable: true,
        ofci: false
      },

      // Fire Protection (10-44-00)
      {
        sku: "FS-2A10BC",
        description: "Fire Extinguisher, 2A:10BC, Dry Chemical",
        manufacturer: "FireSafe",
        model: "FS-2A10BC",
        unit: "Each",
        category: "Fire Protection",
        finish: "Red Paint",
        mounting: "Wall Mount",
        adaFlags: [],
        leadTimeDays: 14,
        lastCost: "45.90",
        minOrderQty: 6,
        substitutable: false,
        ofci: true
      },
      {
        sku: "FS-CAB-24",
        description: "Fire Extinguisher Cabinet, 24\" x 16\" x 8\"",
        manufacturer: "FireSafe",
        model: "CAB-24",
        unit: "Each",
        category: "Fire Protection", 
        finish: "White Paint",
        mounting: "Surface/Semi-Recessed",
        adaFlags: [],
        leadTimeDays: 21,
        lastCost: "125.00",
        minOrderQty: 1,
        substitutable: true,
        ofci: false
      },
      {
        sku: "FS-HOSE-75",
        description: "Fire Hose, 1.5\" x 75', Single Jacket",
        manufacturer: "FireSafe",
        model: "HOSE-75",
        unit: "Each",
        category: "Fire Protection",
        finish: "Red Rubber",
        mounting: "Hose Rack",
        adaFlags: [],
        leadTimeDays: 18,
        lastCost: "180.75",
        minOrderQty: 1,
        substitutable: false,
        ofci: true
      },

      // Lockers (10-55-00)
      {
        sku: "ML-1212-GY",
        description: "Single Tier Locker, 12\" x 12\" x 72\", Gray", 
        manufacturer: "Metro Lockers",
        model: "ST-1212",
        unit: "Each",
        category: "Lockers",
        finish: "Gray Paint",
        mounting: "Floor Mount",
        adaFlags: [],
        leadTimeDays: 28,
        lastCost: "285.00",
        minOrderQty: 5,
        substitutable: true,
        ofci: false
      },
      {
        sku: "ML-1818-BL",
        description: "Double Tier Locker, 18\" x 18\" x 36\", Blue",
        manufacturer: "Metro Lockers", 
        model: "DT-1818",
        unit: "Each",
        category: "Lockers",
        finish: "Blue Paint",
        mounting: "Floor Mount", 
        adaFlags: [],
        leadTimeDays: 35,
        lastCost: "195.50",
        minOrderQty: 8,
        substitutable: true,
        ofci: false
      },
      {
        sku: "ML-BENCH-48",
        description: "Locker Room Bench, 48\" x 12\", Plastic",
        manufacturer: "Metro Lockers",
        model: "BENCH-48",
        unit: "Each",
        category: "Lockers",
        finish: "Gray Plastic",
        mounting: "Floor/Wall Mount",
        adaFlags: ["ADA Compliant"],
        leadTimeDays: 14,
        lastCost: "125.75",
        minOrderQty: 2,
        substitutable: true,
        ofci: false
      }
    ];

    for (const materialData of materials) {
      const material = await storage.createMaterial({
        ...materialData,
        organizationId: organization.id
      });
      console.log(`✅ Created material: ${material.sku} - ${material.description}`);
    }

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Demo Login Credentials:");
    console.log("Admin: admin@metro-construction.com / admin123");
    console.log("Project Manager: pm@metro-construction.com / pm123"); 
    console.log("Purchaser: purchaser@metro-construction.com / purchaser123");
    console.log("Field User: field@metro-construction.com / field123");
    console.log("AP User: ap@metro-construction.com / ap123");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

export { seedDatabase };
