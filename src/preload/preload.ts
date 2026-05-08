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
import { ipcChannels } from "../shared/ipc-contracts";

const invoke = <T>(channel: string, payload?: unknown): Promise<T> => ipcRenderer.invoke(channel, payload);

const api: DesktopApi = {
  bootstrap: () => invoke(ipcChannels.bootstrap),
  setupAdmin: (input: SetupAdminInput) => invoke(ipcChannels.setupAdmin, input),
  login: (input: LoginInput) => invoke(ipcChannels.login, input),
  restoreSession: (token: string) => invoke(ipcChannels.restoreSession, token),
  logout: (token?: string) => invoke(ipcChannels.logout, token),
  listClients: () => invoke(ipcChannels.listClients),
  saveClient: (input: ClientInput & { id?: string }) => invoke(ipcChannels.saveClient, input),
  deleteClient: (id: string) => invoke(ipcChannels.deleteClient, id),
  listDrivers: () => invoke(ipcChannels.listDrivers),
  saveDriver: (input: DriverInput & { id?: string }) => invoke(ipcChannels.saveDriver, input),
  deleteDriver: (id: string) => invoke(ipcChannels.deleteDriver, id),
  listVehicles: () => invoke(ipcChannels.listVehicles),
  saveVehicle: (input: VehicleInput & { id?: string }) => invoke(ipcChannels.saveVehicle, input),
  deleteVehicle: (id: string) => invoke(ipcChannels.deleteVehicle, id),
  listUsers: () => invoke(ipcChannels.listUsers),
  saveUser: (input: UserInput & { id?: string }) => invoke(ipcChannels.saveUser, input),
  deleteUser: (id: string) => invoke(ipcChannels.deleteUser, id),
  listEmployees: (clientId?: string) => invoke(ipcChannels.listEmployees, clientId),
  importEmployees: (payload: ImportPayload) => invoke(ipcChannels.importEmployees, payload),
  listImportTemplates: (clientId: string) => invoke(ipcChannels.listImportTemplates, clientId),
  saveImportTemplate: (input: ImportTemplateInput) => invoke(ipcChannels.saveImportTemplate, input),
  listRoutes: () => invoke(ipcChannels.listRoutes),
  saveRoute: (input: RouteDraftInput & { id?: string }) => invoke(ipcChannels.saveRoute, input),
  saveRouteBatch: (input: RouteBatchInput) => invoke(ipcChannels.saveRouteBatch, input),
  createBackup: () => invoke(ipcChannels.createBackup),
  getBackupSettings: () => invoke(ipcChannels.getBackupSettings),
  chooseBackupDirectory: () => invoke(ipcChannels.chooseBackupDirectory),
  restoreBackup: () => invoke(ipcChannels.restoreBackup),
  exportDataPackage: () => invoke(ipcChannels.exportDataPackage),
  listAuditLogs: () => invoke(ipcChannels.listAuditLogs),
  checkForUpdates: () => invoke(ipcChannels.checkForUpdates),
  downloadAndInstallUpdate: () => invoke(ipcChannels.downloadAndInstallUpdate),
  onUpdateStatus: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, status: Parameters<typeof callback>[0]) => callback(status);
    ipcRenderer.on(ipcChannels.onUpdateStatus, listener);
    return () => ipcRenderer.off(ipcChannels.onUpdateStatus, listener);
  }
};

contextBridge.exposeInMainWorld("sistemaVans", api);
