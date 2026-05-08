import { app } from "electron";
import { PrismaClient } from "../../prisma-client";
import path from "node:path";
import fs from "node:fs";

let prisma: PrismaClient | null = null;
let schemaReady = false;

export function getDataDir() {
  const dataDir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function getDatabasePath() {
  return path.join(getDataDir(), "sistema-vans.db");
}

export function configureDatabaseUrl() {
  process.env.DATABASE_URL = `file:${getDatabasePath().replace(/\\/g, "/")}`;
}

export function getPrisma() {
  if (!prisma) {
    configureDatabaseUrl();
    prisma = new PrismaClient();
  }
  return prisma;
}

function getMigrationPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "prisma", "migrations", "202605080001_init", "migration.sql");
  }
  return path.join(process.cwd(), "prisma", "migrations", "202605080001_init", "migration.sql");
}

export async function ensureDatabaseSchema() {
  if (schemaReady) {
    return;
  }

  const client = getPrisma();
  const tables = await client.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
  );

  if (tables.length === 0) {
    const migration = fs.readFileSync(getMigrationPath(), "utf8");
    const statements = migration.split(";").map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await client.$executeRawUnsafe(statement);
    }
  }

  schemaReady = true;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
