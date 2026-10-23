import { z } from "zod";
export const leadCreateSchema = z.object({
  name: z.string().min(2), phone: z.string().min(10), email: z.string().email().optional().nullable(),
  company: z.string().optional().nullable(), city: z.string().optional().nullable(), location: z.string().optional().nullable(),
  productCode: z.string().optional().nullable(), requestedAmount: z.number().positive().optional().nullable(),
  source: z.string().default("MANUAL"), remarks: z.string().optional().nullable(), assignedToId: z.string().optional().nullable(),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const employeeCreateSchema = z.object({
  name: z.string().min(2), email: z.string().email(), phone: z.string().optional().nullable(),
  password: z.string().min(8), role: z.enum(["SUPER_ADMIN","ADMIN","TELECALLER","BACK_OFFICE"]), employeeCode: z.string().min(2),
});
