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

function getMigrationsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "prisma", "migrations");
  }
  return path.join(process.cwd(), "prisma", "migrations");
}

function isBenignMigrationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return [
    "already exists",
    "duplicate column name"
  ].some((item) => message.includes(item));
}

function splitSqlStatements(sql: string) {
  return sql.split(";").map((statement) => statement.trim()).filter(Boolean);
}

async function runMigrationStatements(client: PrismaClient, filePath: string) {
  const migration = fs.readFileSync(filePath, "utf8");
  for (const statement of splitSqlStatements(migration)) {
    try {
      await client.$executeRawUnsafe(statement);
    } catch (error) {
      if (!isBenignMigrationError(error)) {
        throw error;
      }
    }
  }
}

export async function ensureDatabaseSchema() {
  if (schemaReady) {
    return;
  }

  const client = getPrisma();
  const migrationsDir = getMigrationsDir();
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Pasta de migrations nao encontrada: ${migrationsDir}`);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .sort()
    .map((folder) => path.join(migrationsDir, folder, "migration.sql"))
    .filter((filePath) => fs.existsSync(filePath));

  for (const filePath of migrationFiles) {
    await runMigrationStatements(client, filePath);
  }

  schemaReady = true;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
