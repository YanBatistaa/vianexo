import { type IpcMainInvokeEvent, ipcMain } from "electron";
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import {
  bootstrap,
  createBackup,
  deleteClient,
  deleteDriver,
  deleteUser,
  deleteVehicle,
  getUserAccessState,
  getBackupSettings,
  importEmployees,
  listAuditLogs,
  listImportTemplates,
  listClients,
  listDrivers,
  listEmployees,
  listRoutes,
  listUsers,
  listVehicles,
  saveClient,
  saveDriver,
  saveImportTemplate,
  saveRoute,
  saveRouteBatch,
  saveUser,
  saveVehicle,
  setBackupDirectory,
  setupAdmin,
  login,
  restoreBackup
} from "./repositories";
import type { PermissionAction, PermissionModule } from "../shared/contracts";
import { ipcChannels } from "../shared/ipc-contracts";
import { hasPermission } from "../shared/permissions";
import {
  clientSchema,
  driverSchema,
  importSchema,
  importTemplateSchema,
  loginSchema,
  routeBatchSchema,
  routeSchema,
  setupAdminSchema,
  userSchema,
  vehicleSchema
} from "./validation";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

const sessions = new Map<number, string>();

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
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput> | TOutput
) {
  ipcMain.handle(channel, async (event, input: TInput) => {
    try {
      return await handler(input, event);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      throw new Error(message);
    }
  });
}

async function requirePermission(event: IpcMainInvokeEvent, module: PermissionModule, action: PermissionAction) {
  await getSessionUserId(event);
  await assertPermissionForUser(event, module, action);
}

async function getSessionUserId(event: IpcMainInvokeEvent) {
  const userId = sessions.get(event.sender.id);
  if (!userId) {
    throw new Error("Sessao expirada. Entre novamente.");
  }
  return userId;
}

async function assertPermissionForUser(event: IpcMainInvokeEvent, module: PermissionModule, action: PermissionAction) {
  const userId = await getSessionUserId(event);
  const user = await getUserAccessState(userId);
  if (!user || user.status !== "ACTIVE") {
    sessions.delete(event.sender.id);
    throw new Error("Sessao invalida. Entre novamente.");
  }

  if (!hasPermission(user.permissions, module, action)) {
    throw new Error("Seu usuario nao tem permissao para esta acao.");
  }
}

function protectedHandle<TInput, TOutput>(
  channel: string,
  module: PermissionModule,
  action: PermissionAction | ((input: TInput) => PermissionAction),
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput> | TOutput
) {
  handle(channel, async (input: TInput, event) => {
    const resolvedAction = typeof action === "function" ? action(input) : action;
    await requirePermission(event, module, resolvedAction);
    return handler(input, event);
  });
}

export function registerIpcHandlers() {
  handle(ipcChannels.bootstrap, () => bootstrap());
  handle(ipcChannels.setupAdmin, (input) => setupAdmin(setupAdminSchema.parse(input)));
  handle(ipcChannels.login, async (input, event) => {
    const user = await login(loginSchema.parse(input));
    sessions.set(event.sender.id, user.id);
    return user;
  });
  handle(ipcChannels.logout, (_input, event) => {
    sessions.delete(event.sender.id);
    return true;
  });

  protectedHandle(ipcChannels.listClients, "clients", "view", () => listClients());
  protectedHandle(ipcChannels.saveClient, "clients", (input: any) => input?.id ? "edit" : "create", (input) => saveClient(clientSchema.parse(input)));
  protectedHandle(ipcChannels.deleteClient, "clients", "delete", (id: string) => deleteClient(id));

  protectedHandle(ipcChannels.listDrivers, "drivers", "view", () => listDrivers());
  protectedHandle(ipcChannels.saveDriver, "drivers", (input: any) => input?.id ? "edit" : "create", (input) => saveDriver(driverSchema.parse(input)));
  protectedHandle(ipcChannels.deleteDriver, "drivers", "delete", (id: string) => deleteDriver(id));

  protectedHandle(ipcChannels.listVehicles, "vehicles", "view", () => listVehicles());
  protectedHandle(ipcChannels.saveVehicle, "vehicles", (input: any) => input?.id ? "edit" : "create", (input) => saveVehicle(vehicleSchema.parse(input)));
  protectedHandle(ipcChannels.deleteVehicle, "vehicles", "delete", (id: string) => deleteVehicle(id));

  protectedHandle(ipcChannels.listUsers, "users", "view", () => listUsers());
  protectedHandle(ipcChannels.saveUser, "users", (input: any) => input?.id ? "edit" : "create", async (input, event) => saveUser(userSchema.parse(input), await getSessionUserId(event)));
  protectedHandle(ipcChannels.deleteUser, "users", "delete", async (id: string, event) => deleteUser(id, await getSessionUserId(event)));

  protectedHandle(ipcChannels.listEmployees, "employees", "view", (clientId?: string) => listEmployees(clientId));
  protectedHandle(ipcChannels.importEmployees, "imports", "create", (input) => importEmployees(importSchema.parse(input)));
  protectedHandle(ipcChannels.listImportTemplates, "imports", "view", (clientId: string) => listImportTemplates(clientId));
  protectedHandle(ipcChannels.saveImportTemplate, "imports", "create", (input) => saveImportTemplate(importTemplateSchema.parse(input)));

  protectedHandle(ipcChannels.listRoutes, "routes", "view", () => listRoutes());
  protectedHandle(ipcChannels.saveRoute, "routes", (input: any) => input?.id ? "edit" : "create", (input) => saveRoute(routeSchema.parse(input)));
  protectedHandle(ipcChannels.saveRouteBatch, "routes", (input: any) => input?.routes?.some((route: any) => route.id) ? "edit" : "create", (input) => saveRouteBatch(routeBatchSchema.parse(input)));

  protectedHandle(ipcChannels.createBackup, "settings", "create", async (_input, event) => createBackup(await getSessionUserId(event)));
  protectedHandle(ipcChannels.getBackupSettings, "settings", "view", () => getBackupSettings());
  protectedHandle(ipcChannels.chooseBackupDirectory, "settings", "edit", async () => {
    const result = await dialog.showOpenDialog({
      title: "Escolher pasta de backups do ViaNexo",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths[0]) {
      return {};
    }
    return setBackupDirectory(result.filePaths[0]);
  });
  protectedHandle(ipcChannels.restoreBackup, "settings", "edit", async (_input, event) => {
    const result = await dialog.showOpenDialog({
      title: "Selecionar backup do ViaNexo",
      properties: ["openFile"],
      filters: [{ name: "Banco SQLite", extensions: ["db"] }]
    });
    if (result.canceled || !result.filePaths[0]) {
      return { restored: false };
    }
    return restoreBackup(result.filePaths[0], await getSessionUserId(event));
  });
  protectedHandle(ipcChannels.listAuditLogs, "settings", "view", () => listAuditLogs());
  handle(ipcChannels.checkForUpdates, async () => {
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

  handle(ipcChannels.downloadAndInstallUpdate, async () => {
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
