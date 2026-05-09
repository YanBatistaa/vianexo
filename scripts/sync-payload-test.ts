import { PrismaClient } from "../prisma-client";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createFullPermissionMatrix } from "../src/shared/permissions";
import { exportLocalSyncRecords, restoreLocalSyncRecords } from "../src/main/sync";

process.env.DATABASE_URL = "file:./sync-payload-test.db";

fs.rmSync(path.resolve("prisma/sync-payload-test.db"), { force: true });

const prisma = new PrismaClient();

const permissionData = Object.entries(createFullPermissionMatrix()).flatMap(([module, moduleActions]) =>
  Object.entries(moduleActions).map(([action, allowed]) => ({ module, action, allowed }))
);

async function applyMigrations() {
  const migrationsDir = path.resolve("prisma/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir)
    .sort()
    .map((folder) => path.join(migrationsDir, folder, "migration.sql"))
    .filter((file) => fs.existsSync(file));

  for (const file of migrationFiles) {
    const migration = fs.readFileSync(file, "utf8");
    for (const statement of migration.split(";").map((item) => item.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }
}

async function seedData() {
  const admin = await prisma.user.create({
    data: {
      name: "Admin Sync",
      email: "admin-sync@sistema.local",
      passwordHash: await bcrypt.hash("123456", 10),
      permissions: { createMany: { data: permissionData } }
    }
  });
  const client = await prisma.client.create({ data: { name: "Empresa Sync", contact: "Marina" } });
  const driver = await prisma.driver.create({ data: { name: "Joao Sync" } });
  const vehicle = await prisma.vehicle.create({ data: { label: "Van Sync", plate: "SYN1C23", capacity: 12 } });
  await prisma.vehicleDriver.create({ data: { vehicleId: vehicle.id, driverId: driver.id } });
  const employee = await prisma.employee.create({
    data: {
      clientId: client.id,
      name: "Funcionario Sync",
      address: "Rua 1",
      destination: "Empresa",
      extraData: JSON.stringify({ turno: "noite" })
    }
  });
  const route = await prisma.route.create({
    data: { clientId: client.id, name: "Rota Sync", date: new Date("2026-05-09T12:00:00.000Z"), status: "FINAL" }
  });
  const routeVehicle = await prisma.routeVehicle.create({
    data: { routeId: route.id, vehicleId: vehicle.id, driverId: driver.id, groupName: "Grupo Sync", sequence: 1 }
  });
  await prisma.routePassenger.create({
    data: { routeId: route.id, routeVehicleId: routeVehicle.id, employeeId: employee.id, order: 1 }
  });
  return { admin, client, driver, vehicle, employee, route, routeVehicle };
}

async function clearData() {
  await prisma.routePassenger.deleteMany();
  await prisma.routeVehicle.deleteMany();
  await prisma.route.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.importTemplate.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.vehicleDriver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.client.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await applyMigrations();
  const seeded = await seedData();
  const records = await exportLocalSyncRecords(prisma);

  assert(records.some((record) => record.entity === "clients" && record.recordId === seeded.client.id), "client record not exported");
  assert(records.some((record) => record.entity === "route_passengers"), "route passenger records not exported");

  await clearData();
  await restoreLocalSyncRecords(prisma, records);

  const restoredRoute = await prisma.route.findUnique({
    where: { id: seeded.route.id },
    include: { vehicles: true, passengers: true }
  });
  const restoredAdmin = await prisma.user.findUnique({
    where: { id: seeded.admin.id },
    include: { permissions: true }
  });

  assert(restoredRoute?.name === "Rota Sync", "route not restored");
  assert(restoredRoute.vehicles.length === 1, "route vehicle not restored");
  assert(restoredRoute.passengers.length === 1, "route passenger not restored");
  assert(restoredAdmin?.permissions.length === permissionData.length, "user permissions not restored");

  console.log(`Sync payload test ok: ${records.length} records exported and restored.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
