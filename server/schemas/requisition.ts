import { z } from "zod";

export const RequisitionLineSchema = z.object({
  materialId: z.string().uuid().optional().nullable().transform(val => val && val.trim() || null), // either materialId or description is required
  description: z.string().trim().min(1, "Line description is required"),
  model: z.string().trim().optional().nullable().transform(val => val && val.trim() || null),
  unit: z.string().trim().min(1, "Unit is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  estimatedCost: z.coerce.number().min(0).optional(),
  notes: z.string().trim().optional().nullable(),
}).refine(
  (data) => data.materialId || data.description,
  { message: "Either materialId or description is required", path: ["description"] }
);

export const RequisitionCreateSchema = z.object({
  projectId: z.string().uuid({ message: "Project ID must be a valid UUID" }),
  title: z.string().trim().min(1, "Title is required"),
  targetDeliveryDate: z.string().optional().nullable().transform((val) => {
    if (!val || val.trim() === '') return null;
    // Return as ISO string for database storage
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }),
  deliveryLocation: z.string().trim().optional().nullable(),
  specialInstructions: z.string().trim().optional().nullable(),
  lines: z.array(RequisitionLineSchema).min(1, "At least one line item is required"),
  
  // Optional fields that client might send but server will override
  organizationId: z.string().optional(),
  requesterId: z.string().optional(),
  number: z.string().optional(),
  contractEstimateId: z.string().uuid().optional().nullable(),
  zone: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(),
  geoLocation: z.string().optional().nullable(),
  rfqId: z.string().uuid().optional().nullable(),
});

export type RequisitionCreateInput = z.infer<typeof RequisitionCreateSchema>;
export type RequisitionLineInput = z.infer<typeof RequisitionLineSchema>;