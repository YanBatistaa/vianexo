import { contextBridge, ipcRenderer } from "electron";
import type {
  ClientInput,
  DesktopApi,
  DriverInput,
  ImportPayload,
  ImportTemplateInput,
  LoginInput,
  RouteBatchInput,
  RouteDraftInput,
  SetupAdminInput,
  UserInput,
  VehicleInput
} from "../shared/contracts";

const invoke = <T>(channel: string, payload?: unknown): Promise<T> => ipcRenderer.invoke(channel, payload);

const api: DesktopApi = {
  bootstrap: () => invoke("app:bootstrap"),
  setupAdmin: (input: SetupAdminInput) => invoke("setup:admin", input),
  login: (input: LoginInput) => invoke("auth:login", input),
  logout: () => invoke("auth:logout"),
  listClients: () => invoke("clients:list"),
  saveClient: (input: ClientInput & { id?: string }) => invoke("clients:save", input),
  deleteClient: (id: string) => invoke("clients:delete", id),
  listDrivers: () => invoke("drivers:list"),
  saveDriver: (input: DriverInput & { id?: string }) => invoke("drivers:save", input),
  deleteDriver: (id: string) => invoke("drivers:delete", id),
  listVehicles: () => invoke("vehicles:list"),
  saveVehicle: (input: VehicleInput & { id?: string }) => invoke("vehicles:save", input),
  deleteVehicle: (id: string) => invoke("vehicles:delete", id),
  listUsers: () => invoke("users:list"),
  saveUser: (input: UserInput & { id?: string }) => invoke("users:save", input),
  deleteUser: (id: string) => invoke("users:delete", id),
  listEmployees: (clientId?: string) => invoke("employees:list", clientId),
  importEmployees: (payload: ImportPayload) => invoke("employees:import", payload),
  listImportTemplates: (clientId: string) => invoke("imports:templates:list", clientId),
  saveImportTemplate: (input: ImportTemplateInput) => invoke("imports:templates:save", input),
  listRoutes: () => invoke("routes:list"),
  saveRoute: (input: RouteDraftInput & { id?: string }) => invoke("routes:save", input),
  saveRouteBatch: (input: RouteBatchInput) => invoke("routes:save-batch", input),
  createBackup: () => invoke("backup:create"),
  getBackupSettings: () => invoke("backup:settings"),
  chooseBackupDirectory: () => invoke("backup:choose-directory"),
  restoreBackup: () => invoke("backup:restore"),
  listAuditLogs: () => invoke("audit:list"),
  checkForUpdates: () => invoke("updates:check"),
  downloadAndInstallUpdate: () => invoke("updates:download-and-install")
};

contextBridge.exposeInMainWorld("sistemaVans", api);
