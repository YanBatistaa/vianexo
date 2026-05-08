import { PrismaClient } from "../prisma-client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { createFullPermissionMatrix } from "../src/shared/permissions";

process.env.DATABASE_URL = "file:./smoke-test.db";

fs.rmSync(path.resolve("prisma/smoke-test.db"), { force: true });

const prisma = new PrismaClient();

const permissionData = Object.entries(createFullPermissionMatrix()).flatMap(([module, moduleActions]) =>
  Object.entries(moduleActions).map(([action, allowed]) => ({ module, action, allowed }))
);

async function main() {
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

  await prisma.routePassenger.deleteMany();
  await prisma.routeVehicle.deleteMany();
  await prisma.route.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.vehicleDriver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.client.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@sistema.local",
      passwordHash: await bcrypt.hash("123456", 10),
      permissions: { createMany: { data: permissionData } }
    }
  });

  const client = await prisma.client.create({ data: { name: "Empresa Modelo", contact: "Dona Maria" } });
  const driver = await prisma.driver.create({ data: { name: "Carlos Motorista", phone: "(11) 99999-0000" } });
  const vehicle = await prisma.vehicle.create({ data: { label: "Van 01", plate: "ABC1D23", capacity: 15 } });
  await prisma.vehicleDriver.create({ data: { vehicleId: vehicle.id, driverId: driver.id } });
  const employee = await prisma.employee.create({
    data: {
      clientId: client.id,
      name: "Ana Silva",
      address: "Centro",
      destination: "Galpao A",
      extraData: JSON.stringify({ turno: "manha" })
    }
  });
  const route = await prisma.route.create({
    data: { clientId: client.id, name: "Roteiro Piloto", date: new Date(), status: "FINAL" }
  });
  const routeVehicle = await prisma.routeVehicle.create({
    data: { routeId: route.id, vehicleId: vehicle.id, driverId: driver.id, groupName: "Van 01" }
  });
  await prisma.routePassenger.create({
    data: { routeId: route.id, routeVehicleId: routeVehicle.id, employeeId: employee.id }
  });

  console.log(`Smoke test ok: ${admin.email}, ${client.name}, ${vehicle.label}, ${employee.name}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
