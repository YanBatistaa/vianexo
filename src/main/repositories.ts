import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { disconnectPrisma, ensureDatabaseSchema, getDatabasePath, getPrisma } from "./db";
import { createFullPermissionMatrix } from "../shared/permissions";
import type { PermissionMatrix } from "../shared/contracts";

function clean<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== "")
  ) as T;
}

function permissionRows(userId: string, permissions: PermissionMatrix) {
  return Object.entries(permissions).flatMap(([module, moduleActions]) =>
    Object.entries(moduleActions).map(([action, allowed]) => ({ userId, module, action, allowed }))
  );
}

function assertKeepsCriticalSelfAccess(input: any) {
  if (input.status === "INACTIVE") {
    throw new Error("Voce nao pode desativar o proprio usuario.");
  }

  if (!input.permissions) return;
  const permissions = input.permissions as PermissionMatrix;
  const required = [
    permissions.users?.view,
    permissions.users?.edit,
    permissions.users?.delete,
    permissions.settings?.edit
  ];
  if (required.some((allowed) => allowed !== true)) {
    throw new Error("Voce nao pode remover suas proprias permissoes criticas.");
  }
}

export async function bootstrap() {
  await ensureDatabaseSchema();
  const prisma = getPrisma();
  const userCount = await prisma.user.count();
  return {
    needsSetup: userCount === 0,
    appVersion: app.getVersion()
  };
}

export async function setupAdmin(input: { name: string; email: string; password: string }) {
  const prisma = getPrisma();
  if ((await prisma.user.count()) > 0) {
    throw new Error("Setup inicial ja foi concluido.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      permissions: {
        createMany: {
          data: permissionRows("", createFullPermissionMatrix()).map(({ module, action, allowed }) => ({
            module,
            action,
            allowed
          }))
        }
      }
    },
    select: { id: true, name: true, email: true }
  });
}

export async function login(input: { email: string; password: string }) {
  await ensureDatabaseSchema();
  const user = await getPrisma().user.findUnique({
    where: { email: input.email },
    include: { permissions: true }
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("Usuario ou senha invalidos.");
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    throw new Error("Usuario ou senha invalidos.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    permissions: user.permissions
  };
}

export async function getUserAccessState(userId: string) {
  return getPrisma().user.findUnique({
    where: { id: userId },
    select: { status: true, permissions: true }
  });
}

export async function listClients() {
  return getPrisma().client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { employees: true, routes: true } } }
  });
}

export async function saveClient(input: any) {
  const prisma = getPrisma();
  const data = clean({
    name: input.name,
    document: input.document,
    contact: input.contact,
    phone: input.phone,
    email: input.email,
    notes: input.notes
  });
  return input.id
    ? prisma.client.update({ where: { id: input.id }, data })
    : prisma.client.create({ data });
}

export async function deleteClient(id: string) {
  await getPrisma().client.delete({ where: { id } });
  return true;
}

export async function listDrivers() {
  return getPrisma().driver.findMany({
    orderBy: { name: "asc" },
    include: { vehicles: { include: { vehicle: true } } }
  });
}

export async function saveDriver(input: any) {
  const data = clean({ name: input.name, phone: input.phone, document: input.document, notes: input.notes });
  return input.id
    ? getPrisma().driver.update({ where: { id: input.id }, data })
    : getPrisma().driver.create({ data });
}

export async function deleteDriver(id: string) {
  await getPrisma().driver.delete({ where: { id } });
  return true;
}

export async function listVehicles() {
  return getPrisma().vehicle.findMany({
    orderBy: { label: "asc" },
    include: { drivers: { include: { driver: true } } }
  });
}

export async function saveVehicle(input: any) {
  const prisma = getPrisma();
  const data = clean({
    label: input.label,
    plate: input.plate,
    capacity: Number(input.capacity),
    status: input.status ?? "ACTIVE",
    notes: input.notes
  });

  const vehicle = input.id
    ? await prisma.vehicle.update({ where: { id: input.id }, data })
    : await prisma.vehicle.create({ data });

  const driverIds = [...(input.driverIds ?? [])];
  const driverName = String(input.driverName ?? "").trim();

  if (driverName) {
    const existingDriver = await prisma.driver.findFirst({
      where: { name: { equals: driverName } }
    });
    const driver = existingDriver ?? await prisma.driver.create({ data: { name: driverName } });
    if (!driverIds.includes(driver.id)) {
      driverIds.push(driver.id);
    }
  }

  if (input.driverIds || driverName) {
    await prisma.vehicleDriver.deleteMany({ where: { vehicleId: vehicle.id } });
    if (driverIds.length) {
      await prisma.vehicleDriver.createMany({
        data: driverIds.map((driverId: string) => ({ vehicleId: vehicle.id, driverId }))
      });
    }
  }

  return prisma.vehicle.findUnique({
    where: { id: vehicle.id },
    include: { drivers: { include: { driver: true } } }
  });
}

export async function deleteVehicle(id: string) {
  await getPrisma().vehicle.delete({ where: { id } });
  return true;
}

export async function listUsers() {
  return getPrisma().user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, status: true, permissions: true, createdAt: true }
  });
}

export async function saveUser(input: any, actorUserId?: string) {
  const prisma = getPrisma();
  if (input.id && input.id === actorUserId) {
    assertKeepsCriticalSelfAccess(input);
  }
  if (input.id && input.status === "INACTIVE") {
    const activeUsers = await prisma.user.count({ where: { status: "ACTIVE", id: { not: input.id } } });
    if (activeUsers === 0) {
      throw new Error("Mantenha pelo menos um usuario ativo no sistema.");
    }
  }
  const data: any = clean({ name: input.name, email: input.email, status: input.status ?? "ACTIVE" });
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const user = input.id
    ? await prisma.user.update({ where: { id: input.id }, data })
    : await prisma.user.create({
        data: { ...data, passwordHash: data.passwordHash ?? (await bcrypt.hash("123456", 10)) }
      });

  if (input.permissions) {
    await prisma.permission.deleteMany({ where: { userId: user.id } });
    await prisma.permission.createMany({ data: permissionRows(user.id, input.permissions) });
  }

  return prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, status: true, permissions: true }
  });
}

export async function deleteUser(id: string, actorUserId?: string) {
  if (id === actorUserId) {
    throw new Error("Voce nao pode excluir o proprio usuario.");
  }
  const prisma = getPrisma();
  const activeUsers = await prisma.user.count({ where: { status: "ACTIVE", id: { not: id } } });
  if (activeUsers === 0) {
    throw new Error("Mantenha pelo menos um usuario ativo no sistema.");
  }
  await prisma.user.delete({ where: { id } });
  return true;
}

export async function listEmployees(clientId?: string) {
  return getPrisma().employee.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { name: "asc" },
    include: { client: true }
  });
}

export async function importEmployees(input: any) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const importJob = await tx.importJob.create({
      data: {
        clientId: input.clientId,
        fileName: input.fileName,
        status: "IMPORTED",
        columnMap: JSON.stringify(input.columnMap),
        importedRows: input.rows.length,
        rawPreview: JSON.stringify(input.rawPreview ?? [])
      }
    });

    const employees = [];
    for (const row of input.rows) {
      employees.push(await tx.employee.create({
        data: {
          clientId: input.clientId,
          name: row.name,
          address: row.address,
          destination: row.destination,
          phone: row.phone,
          notes: row.notes,
          extraData: JSON.stringify(row.extraData ?? {})
        }
      }));
    }

    return { importJob, employees };
  });
}

export async function listRoutes() {
  return getPrisma().route.findMany({
    orderBy: { date: "desc" },
    include: {
      client: true,
      vehicles: { include: { vehicle: true, driver: true, passengers: { include: { employee: true } } } },
      passengers: { include: { employee: true } }
    }
  });
}

export async function saveRoute(input: any) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const route = input.id
      ? await tx.route.update({
          where: { id: input.id },
          data: { clientId: input.clientId, name: input.name, date: new Date(input.date), status: input.status, notes: input.notes }
        })
      : await tx.route.create({
          data: { clientId: input.clientId, name: input.name, date: new Date(input.date), status: input.status, notes: input.notes }
        });

    await tx.routePassenger.deleteMany({ where: { routeId: route.id } });
    await tx.routeVehicle.deleteMany({ where: { routeId: route.id } });

    for (const [sequence, vehicleDraft] of input.vehicles.entries()) {
      const routeVehicle = await tx.routeVehicle.create({
        data: {
          routeId: route.id,
          vehicleId: vehicleDraft.vehicleId,
          driverId: vehicleDraft.driverId || null,
          groupName: vehicleDraft.groupName,
          sequence
        }
      });

      for (const [order, employeeId] of vehicleDraft.employeeIds.entries()) {
        await tx.routePassenger.create({
          data: { routeId: route.id, routeVehicleId: routeVehicle.id, employeeId, order }
        });
      }
    }

    return tx.route.findUnique({
      where: { id: route.id },
      include: {
        client: true,
        vehicles: { include: { vehicle: true, driver: true, passengers: { include: { employee: true } } } }
      }
    });
  });
}

async function getMultiClientId() {
  const prisma = getPrisma();
  const existing = await prisma.client.findFirst({ where: { name: "Rotas multiclientes" } });
  if (existing) {
    return existing.id;
  }
  const client = await prisma.client.create({
    data: {
      name: "Rotas multiclientes",
      notes: "Cliente tecnico usado para roteiros com funcionarios de empresas diferentes."
    }
  });
  return client.id;
}

export async function saveRouteBatch(input: any) {
  const clientId = input.clientId || await getMultiClientId();
  const savedRoutes = [];

  for (const route of input.routes) {
    savedRoutes.push(await saveRoute({
      id: route.id,
      clientId,
      name: route.name,
      date: input.date,
      status: route.status,
      notes: route.notes,
      vehicles: [{
        vehicleId: route.vehicleId,
        driverId: route.driverId,
        groupName: route.name,
        employeeIds: route.employeeIds
      }]
    }));
  }

  return savedRoutes;
}

export async function createBackup() {
  const dbPath = getDatabasePath();
  const backupDir = path.join(app.getPath("documents"), "Sistema Vans Backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const filePath = path.join(backupDir, `sistema-vans-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, filePath);
  } else {
    fs.writeFileSync(filePath, "");
  }
  return { filePath, createdAt: new Date().toISOString() };
}

export async function restoreBackup(backupPath: string) {
  if (!backupPath || path.extname(backupPath).toLowerCase() !== ".db" || !fs.existsSync(backupPath)) {
    throw new Error("Selecione um backup SQLite valido.");
  }

  const dbPath = getDatabasePath();
  const backupDir = path.join(app.getPath("documents"), "Sistema Vans Backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const safetyCopyPath = path.join(backupDir, `antes-da-restauracao-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);

  await disconnectPrisma();
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, safetyCopyPath);
  }
  fs.copyFileSync(backupPath, dbPath);
  await ensureDatabaseSchema();

  return {
    restored: true,
    restoredFrom: backupPath,
    safetyCopyPath,
    restoredAt: new Date().toISOString()
  };
}
