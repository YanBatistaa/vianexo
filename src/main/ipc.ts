import { ipcMain } from "electron";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import {
  bootstrap,
  createBackup,
  deleteClient,
  deleteDriver,
  deleteUser,
  deleteVehicle,
  importEmployees,
  listClients,
  listDrivers,
  listEmployees,
  listRoutes,
  listUsers,
  listVehicles,
  saveClient,
  saveDriver,
  saveRoute,
  saveRouteBatch,
  saveUser,
  saveVehicle,
  setupAdmin,
  login
} from "./repositories";
import {
  clientSchema,
  driverSchema,
  importSchema,
  loginSchema,
  routeBatchSchema,
  routeSchema,
  setupAdminSchema,
  userSchema,
  vehicleSchema
} from "./validation";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function compareVersions(versionA: string, versionB: string) {
  const left = versionA.split(".").map((part) => Number(part) || 0);
  const right = versionB.split(".").map((part) => Number(part) || 0);
  const max = Math.max(left.length, right.length);

  for (let index = 0; index < max; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function handle<TInput, TOutput>(
  channel: string,
  handler: (input: TInput) => Promise<TOutput> | TOutput
) {
  ipcMain.handle(channel, async (_event, input: TInput) => {
    try {
      return await handler(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      throw new Error(message);
    }
  });
}

export function registerIpcHandlers() {
  handle("app:bootstrap", () => bootstrap());
  handle("setup:admin", (input) => setupAdmin(setupAdminSchema.parse(input)));
  handle("auth:login", (input) => login(loginSchema.parse(input)));

  handle("clients:list", () => listClients());
  handle("clients:save", (input) => saveClient(clientSchema.parse(input)));
  handle("clients:delete", (id: string) => deleteClient(id));

  handle("drivers:list", () => listDrivers());
  handle("drivers:save", (input) => saveDriver(driverSchema.parse(input)));
  handle("drivers:delete", (id: string) => deleteDriver(id));

  handle("vehicles:list", () => listVehicles());
  handle("vehicles:save", (input) => saveVehicle(vehicleSchema.parse(input)));
  handle("vehicles:delete", (id: string) => deleteVehicle(id));

  handle("users:list", () => listUsers());
  handle("users:save", (input) => saveUser(userSchema.parse(input)));
  handle("users:delete", (id: string) => deleteUser(id));

  handle("employees:list", (clientId?: string) => listEmployees(clientId));
  handle("employees:import", (input) => importEmployees(importSchema.parse(input)));

  handle("routes:list", () => listRoutes());
  handle("routes:save", (input) => saveRoute(routeSchema.parse(input)));
  handle("routes:save-batch", (input) => saveRouteBatch(routeBatchSchema.parse(input)));

  handle("backup:create", () => createBackup());
  handle("updates:check", async () => {
    const currentVersion = app.getVersion();
    if (process.env.NODE_ENV === "development") {
      return {
        status: "disabled",
        currentVersion,
        message: "A verificacao de atualizacao fica ativa somente no app instalado."
      };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      const latestVersion = result?.updateInfo.version;

      if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
        return {
          status: "available",
          currentVersion,
          latestVersion,
          releaseDate: result.updateInfo.releaseDate
        };
      }

      return { status: "not-available", currentVersion, latestVersion };
    } catch (error) {
      return {
        status: "error",
        currentVersion,
        message: error instanceof Error ? error.message : "Nao foi possivel verificar atualizacoes."
      };
    }
  });

  handle("updates:download-and-install", async () => {
    try {
      await autoUpdater.downloadUpdate();
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return { status: "downloaded" };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel baixar a atualizacao."
      };
    }
  });
}
