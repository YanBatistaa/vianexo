import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../prisma-client";

process.env.DATABASE_URL = "file:./migration-test.db";

const dbPath = path.resolve("prisma/migration-test.db");
fs.rmSync(dbPath, { force: true });

const prisma = new PrismaClient();

async function runSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");
  for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function main() {
  await runSqlFile(path.resolve("prisma/migrations/202605080001_init/migration.sql"));

  const migrationsDir = path.resolve("prisma/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir)
    .sort()
    .map((folder) => path.join(migrationsDir, folder, "migration.sql"))
    .filter((file) => fs.existsSync(file));

  for (const file of migrationFiles.slice(1)) {
    await runSqlFile(file);
  }

  const routeColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info('Route')");
  const clientColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info('Client')");
  const authTables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='AuthSession'"
  );

  const hasRouteVersion = routeColumns.some((column) => column.name === "version");
  const hasContractNumber = clientColumns.some((column) => column.name === "contractNumber");
  const hasMonthlyValue = clientColumns.some((column) => column.name === "monthlyValue");
  if (!hasRouteVersion || !hasContractNumber || !hasMonthlyValue || authTables.length !== 1) {
    throw new Error("Migration test failed: upgraded schema missing expected fields.");
  }

  console.log("Migration test ok.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    fs.rmSync(dbPath, { force: true });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
