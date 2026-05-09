import type { PrismaClient } from "../../prisma-client";

export type SyncEntity =
  | "users"
  | "permissions"
  | "clients"
  | "import_templates"
  | "employees"
  | "drivers"
  | "vehicles"
  | "vehicle_drivers"
  | "import_jobs"
  | "routes"
  | "route_vehicles"
  | "route_passengers";

export type LocalSyncRecord = {
  entity: SyncEntity;
  recordId: string;
  sourceUpdatedAt: string;
  payload: Record<string, unknown>;
  deletedAt?: string | null;
};

type EntityConfig = {
  entity: SyncEntity;
  list: (prisma: PrismaClient) => Promise<Array<Record<string, unknown>>>;
  deleteAll: (prisma: PrismaClient) => Promise<unknown>;
  create: (prisma: PrismaClient, data: Record<string, unknown>) => Promise<unknown>;
};

function serializeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value
    ])
  );
}

function sourceUpdatedAt(row: Record<string, unknown>) {
  const value = row.updatedAt ?? row.createdAt;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

const entityConfigs: EntityConfig[] = [
  {
    entity: "users",
    list: (prisma) => prisma.user.findMany(),
    deleteAll: (prisma) => prisma.user.deleteMany(),
    create: (prisma, data) => prisma.user.create({ data: data as any })
  },
  {
    entity: "permissions",
    list: (prisma) => prisma.permission.findMany(),
    deleteAll: (prisma) => prisma.permission.deleteMany(),
    create: (prisma, data) => prisma.permission.create({ data: data as any })
  },
  {
    entity: "clients",
    list: (prisma) => prisma.client.findMany(),
    deleteAll: (prisma) => prisma.client.deleteMany(),
    create: (prisma, data) => prisma.client.create({ data: data as any })
  },
  {
    entity: "import_templates",
    list: (prisma) => prisma.importTemplate.findMany(),
    deleteAll: (prisma) => prisma.importTemplate.deleteMany(),
    create: (prisma, data) => prisma.importTemplate.create({ data: data as any })
  },
  {
    entity: "employees",
    list: (prisma) => prisma.employee.findMany(),
    deleteAll: (prisma) => prisma.employee.deleteMany(),
    create: (prisma, data) => prisma.employee.create({ data: data as any })
  },
  {
    entity: "drivers",
    list: (prisma) => prisma.driver.findMany(),
    deleteAll: (prisma) => prisma.driver.deleteMany(),
    create: (prisma, data) => prisma.driver.create({ data: data as any })
  },
  {
    entity: "vehicles",
    list: (prisma) => prisma.vehicle.findMany(),
    deleteAll: (prisma) => prisma.vehicle.deleteMany(),
    create: (prisma, data) => prisma.vehicle.create({ data: data as any })
  },
  {
    entity: "vehicle_drivers",
    list: (prisma) => prisma.vehicleDriver.findMany(),
    deleteAll: (prisma) => prisma.vehicleDriver.deleteMany(),
    create: (prisma, data) => prisma.vehicleDriver.create({ data: data as any })
  },
  {
    entity: "import_jobs",
    list: (prisma) => prisma.importJob.findMany(),
    deleteAll: (prisma) => prisma.importJob.deleteMany(),
    create: (prisma, data) => prisma.importJob.create({ data: data as any })
  },
  {
    entity: "routes",
    list: (prisma) => prisma.route.findMany(),
    deleteAll: (prisma) => prisma.route.deleteMany(),
    create: (prisma, data) => prisma.route.create({ data: data as any })
  },
  {
    entity: "route_vehicles",
    list: (prisma) => prisma.routeVehicle.findMany(),
    deleteAll: (prisma) => prisma.routeVehicle.deleteMany(),
    create: (prisma, data) => prisma.routeVehicle.create({ data: data as any })
  },
  {
    entity: "route_passengers",
    list: (prisma) => prisma.routePassenger.findMany(),
    deleteAll: (prisma) => prisma.routePassenger.deleteMany(),
    create: (prisma, data) => prisma.routePassenger.create({ data: data as any })
  }
];

const deleteOrder: SyncEntity[] = [
  "route_passengers",
  "route_vehicles",
  "routes",
  "import_jobs",
  "import_templates",
  "employees",
  "vehicle_drivers",
  "vehicles",
  "drivers",
  "clients",
  "permissions",
  "users"
];

const createOrder: SyncEntity[] = [
  "users",
  "permissions",
  "clients",
  "drivers",
  "vehicles",
  "vehicle_drivers",
  "employees",
  "import_templates",
  "import_jobs",
  "routes",
  "route_vehicles",
  "route_passengers"
];

function configFor(entity: SyncEntity) {
  const config = entityConfigs.find((item) => item.entity === entity);
  if (!config) {
    throw new Error(`Entidade de sincronizacao desconhecida: ${entity}`);
  }
  return config;
}

export async function exportLocalSyncRecords(prisma: PrismaClient): Promise<LocalSyncRecord[]> {
  const records: LocalSyncRecord[] = [];

  for (const config of entityConfigs) {
    const rows = await config.list(prisma);
    for (const row of rows) {
      const id = row.id;
      if (typeof id !== "string") continue;
      records.push({
        entity: config.entity,
        recordId: id,
        sourceUpdatedAt: sourceUpdatedAt(row),
        payload: serializeRow(row)
      });
    }
  }

  return records;
}

export async function restoreLocalSyncRecords(prisma: PrismaClient, records: LocalSyncRecord[]) {
  const activeRecords = records.filter((record) => !record.deletedAt);
  const recordsByEntity = new Map<SyncEntity, LocalSyncRecord[]>();

  for (const record of activeRecords) {
    const list = recordsByEntity.get(record.entity) ?? [];
    list.push(record);
    recordsByEntity.set(record.entity, list);
  }

  await prisma.$transaction(async (tx) => {
    for (const entity of deleteOrder) {
      await configFor(entity).deleteAll(tx as PrismaClient);
    }

    for (const entity of createOrder) {
      const config = configFor(entity);
      for (const record of recordsByEntity.get(entity) ?? []) {
        await config.create(tx as PrismaClient, record.payload);
      }
    }
  });

  return { restoredRecords: activeRecords.length };
}
