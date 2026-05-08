import type { PermissionAction, PermissionModule, DesktopApi } from "./contracts";

type IpcContract = {
  channel: string;
  permission?: {
    module: PermissionModule;
    action: PermissionAction | "dynamic";
  };
  payload: string;
  returns: string;
};

export const ipcContracts: Record<keyof DesktopApi, IpcContract> = {
  bootstrap: {
    channel: "app:bootstrap",
    payload: "void",
    returns: "AppBootstrap"
  },
  setupAdmin: {
    channel: "setup:admin",
    payload: "SetupAdminInput",
    returns: "{ id, name, email }"
  },
  login: {
    channel: "auth:login",
    payload: "LoginInput",
    returns: "SessionUser"
  },
  logout: {
    channel: "auth:logout",
    payload: "void",
    returns: "boolean"
  },
  restoreSession: {
    channel: "auth:restore",
    payload: "sessionToken",
    returns: "SessionUser"
  },
  listClients: {
    channel: "clients:list",
    permission: { module: "clients", action: "view" },
    payload: "void",
    returns: "Client[]"
  },
  saveClient: {
    channel: "clients:save",
    permission: { module: "clients", action: "dynamic" },
    payload: "ClientInput & { id? }",
    returns: "Client"
  },
  deleteClient: {
    channel: "clients:delete",
    permission: { module: "clients", action: "delete" },
    payload: "id",
    returns: "boolean"
  },
  listDrivers: {
    channel: "drivers:list",
    permission: { module: "drivers", action: "view" },
    payload: "void",
    returns: "Driver[]"
  },
  saveDriver: {
    channel: "drivers:save",
    permission: { module: "drivers", action: "dynamic" },
    payload: "DriverInput & { id? }",
    returns: "Driver"
  },
  deleteDriver: {
    channel: "drivers:delete",
    permission: { module: "drivers", action: "delete" },
    payload: "id",
    returns: "boolean"
  },
  listVehicles: {
    channel: "vehicles:list",
    permission: { module: "vehicles", action: "view" },
    payload: "void",
    returns: "Vehicle[]"
  },
  saveVehicle: {
    channel: "vehicles:save",
    permission: { module: "vehicles", action: "dynamic" },
    payload: "VehicleInput & { id? }",
    returns: "Vehicle"
  },
  deleteVehicle: {
    channel: "vehicles:delete",
    permission: { module: "vehicles", action: "delete" },
    payload: "id",
    returns: "boolean"
  },
  listUsers: {
    channel: "users:list",
    permission: { module: "users", action: "view" },
    payload: "void",
    returns: "User[]"
  },
  saveUser: {
    channel: "users:save",
    permission: { module: "users", action: "dynamic" },
    payload: "UserInput & { id? }",
    returns: "User"
  },
  deleteUser: {
    channel: "users:delete",
    permission: { module: "users", action: "delete" },
    payload: "id",
    returns: "boolean"
  },
  listEmployees: {
    channel: "employees:list",
    permission: { module: "employees", action: "view" },
    payload: "clientId?",
    returns: "Employee[]"
  },
  saveEmployee: {
    channel: "employees:save",
    permission: { module: "employees", action: "edit" },
    payload: "EmployeeInput & { id? }",
    returns: "Employee"
  },
  importEmployees: {
    channel: "employees:import",
    permission: { module: "imports", action: "create" },
    payload: "ImportPayload",
    returns: "{ importJob, employees }"
  },
  listImportTemplates: {
    channel: "imports:templates:list",
    permission: { module: "imports", action: "view" },
    payload: "clientId",
    returns: "ImportTemplate[]"
  },
  saveImportTemplate: {
    channel: "imports:templates:save",
    permission: { module: "imports", action: "create" },
    payload: "ImportTemplateInput",
    returns: "ImportTemplate"
  },
  listRoutes: {
    channel: "routes:list",
    permission: { module: "routes", action: "view" },
    payload: "void",
    returns: "Route[]"
  },
  saveRoute: {
    channel: "routes:save",
    permission: { module: "routes", action: "dynamic" },
    payload: "RouteDraftInput & { id? }",
    returns: "Route"
  },
  saveRouteBatch: {
    channel: "routes:save-batch",
    permission: { module: "routes", action: "dynamic" },
    payload: "RouteBatchInput",
    returns: "Route[]"
  },
  createBackup: {
    channel: "backup:create",
    permission: { module: "settings", action: "create" },
    payload: "void",
    returns: "BackupResult"
  },
  getBackupSettings: {
    channel: "backup:settings",
    permission: { module: "settings", action: "view" },
    payload: "void",
    returns: "BackupSettings"
  },
  chooseBackupDirectory: {
    channel: "backup:choose-directory",
    permission: { module: "settings", action: "edit" },
    payload: "void",
    returns: "{ directory? }"
  },
  restoreBackup: {
    channel: "backup:restore",
    permission: { module: "settings", action: "edit" },
    payload: "void",
    returns: "RestoreBackupResult"
  },
  exportDataPackage: {
    channel: "data:export-package",
    permission: { module: "settings", action: "view" },
    payload: "void",
    returns: "DataExportPackageResult"
  },
  listAuditLogs: {
    channel: "audit:list",
    permission: { module: "settings", action: "view" },
    payload: "void",
    returns: "AuditLog[]"
  },
  checkForUpdates: {
    channel: "updates:check",
    payload: "void",
    returns: "UpdateCheckResult"
  },
  downloadAndInstallUpdate: {
    channel: "updates:download-and-install",
    payload: "void",
    returns: "UpdateInstallResult"
  },
  onUpdateStatus: {
    channel: "updates:status",
    payload: "callback",
    returns: "unsubscribe"
  }
};

export const ipcChannels = Object.fromEntries(
  Object.entries(ipcContracts).map(([method, contract]) => [method, contract.channel])
) as Record<keyof DesktopApi, string>;
