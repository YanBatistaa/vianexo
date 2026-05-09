import { z } from "zod";

export const setupAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const cloudLoginSchema = loginSchema;

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  document: z.string().optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contractNumber: z.string().optional(),
  monthlyValue: z.coerce.number().nonnegative().optional().or(z.literal("")),
  notes: z.string().optional()
});

export const driverSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().optional(),
  document: z.string().optional(),
  notes: z.string().optional()
});

export const vehicleSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2),
  plate: z.string().optional(),
  capacity: z.coerce.number().int().positive(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).optional(),
  notes: z.string().optional(),
  driverName: z.string().optional(),
  driverIds: z.array(z.string()).optional()
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  permissions: z.record(z.record(z.boolean())).optional()
});

export const importSchema = z.object({
  clientId: z.string(),
  fileName: z.string().min(1),
  columnMap: z.record(z.string()),
  rawPreview: z.array(z.record(z.unknown())).optional(),
  updateExisting: z.boolean().optional(),
  rows: z.array(z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    destination: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
    extraData: z.record(z.unknown()).optional()
  }))
});

export const employeeSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  name: z.string().min(1),
  address: z.string().optional(),
  destination: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  extraData: z.record(z.unknown()).optional()
});

export const importTemplateSchema = z.object({
  clientId: z.string(),
  name: z.string().min(2),
  columnMap: z.record(z.string())
});

export const routeSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  name: z.string().min(2),
  date: z.string().min(8),
  status: z.enum(["DRAFT", "FINAL"]),
  notes: z.string().optional(),
  vehicles: z.array(z.object({
    vehicleId: z.string(),
    driverId: z.string().optional(),
    groupName: z.string().min(1),
    employeeIds: z.array(z.string())
  }))
});

export const routeBatchSchema = z.object({
  clientId: z.string().optional(),
  date: z.string().min(8),
  routes: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(2),
    vehicleId: z.string(),
    driverId: z.string().optional(),
    employeeIds: z.array(z.string()),
    status: z.enum(["DRAFT", "FINAL"]),
    notes: z.string().optional()
  })).min(1)
});
