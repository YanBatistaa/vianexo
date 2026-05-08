export const modules = ["clients", "employees", "vehicles", "drivers", "imports", "routes", "users", "settings"] as const;
export const actions = ["view", "create", "edit", "delete"] as const;

export type PermissionModule = (typeof modules)[number];
export type PermissionAction = (typeof actions)[number];

export type PermissionMatrix = Record<PermissionModule, Record<PermissionAction, boolean>>;

export type PermissionGrant = {
  module: string;
  action: string;
  allowed: boolean;
};

export type AppBootstrap = {
  needsSetup: boolean;
  appVersion: string;
};

export type SetupAdminInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  permissions?: PermissionGrant[];
  sessionToken?: string;
};

export type ClientInput = {
  name: string;
  document?: string;
  contact?: string;
  phone?: string;
  email?: string;
  contractNumber?: string;
  monthlyValue?: number;
  notes?: string;
};

export type DriverInput = {
  name: string;
  phone?: string;
  document?: string;
  notes?: string;
};

export type VehicleInput = {
  label: string;
  plate?: string;
  capacity: number;
  status?: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  notes?: string;
  driverName?: string;
  driverIds?: string[];
};

export type UserInput = {
  name: string;
  email: string;
  password?: string;
  status?: "ACTIVE" | "INACTIVE";
  permissions?: PermissionMatrix;
};

export type EmployeeImportRow = {
  name: string;
  address?: string;
  destination?: string;
  phone?: string;
  notes?: string;
  extraData?: Record<string, unknown>;
};

export type ImportPayload = {
  clientId: string;
  fileName: string;
  columnMap: Record<string, string>;
  rows: EmployeeImportRow[];
  rawPreview?: Record<string, unknown>[];
  updateExisting?: boolean;
};

export type ImportTemplateInput = {
  clientId: string;
  name: string;
  columnMap: Record<string, string>;
};

export type RouteDraftVehicle = {
  vehicleId: string;
  driverId?: string;
  groupName: string;
  employeeIds: string[];
};

export type RouteDraftInput = {
  clientId: string;
  name: string;
  date: string;
  status: "DRAFT" | "FINAL";
  notes?: string;
  vehicles: RouteDraftVehicle[];
};

export type RouteBatchInput = {
  clientId?: string;
  date: string;
  routes: Array<{
    id?: string;
    name: string;
    vehicleId: string;
    driverId?: string;
    employeeIds: string[];
    status: "DRAFT" | "FINAL";
    notes?: string;
  }>;
};

export type RouteReportPassenger = {
  order: number;
  name: string;
  client?: string;
  address?: string;
  destination?: string;
  phone?: string;
};

export type RouteReportCard = {
  name: string;
  vehicle?: string;
  plate?: string;
  driver?: string;
  capacity?: number;
  passengers: RouteReportPassenger[];
};

export type RouteReport = {
  title: string;
  client?: string;
  date: string;
  status?: string;
  version?: number;
  cards: RouteReportCard[];
};

export type BackupResult = {
  filePath: string;
  createdAt: string;
  sha256?: string;
};

export type BackupSettings = {
  directory: string;
  latestBackup?: {
    filePath: string;
    createdAt: string;
    ageDays: number;
    sha256?: string;
  };
};

export type RestoreBackupResult = {
  restored: boolean;
  restoredFrom?: string;
  safetyCopyPath?: string;
  restoredAt?: string;
};

export type DataExportPackageResult = {
  filePath: string;
  createdAt: string;
  counts: {
    clients: number;
    employees: number;
    vehicles: number;
    drivers: number;
    routes: number;
  };
};

export type UpdateCheckResult = {
  status: "available" | "not-available" | "disabled" | "error";
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  message?: string;
};

export type UpdateInstallResult = {
  status: "downloading" | "downloaded" | "error";
  message?: string;
};

export type ApiResult<T> = Promise<T>;

export type DesktopApi = {
  bootstrap(): ApiResult<AppBootstrap>;
  setupAdmin(input: SetupAdminInput): ApiResult<{ id: string; name: string; email: string }>;
  login(input: LoginInput): ApiResult<SessionUser>;
  restoreSession(token: string): ApiResult<SessionUser>;
  logout(token?: string): ApiResult<boolean>;
  listClients(): ApiResult<any[]>;
  saveClient(input: ClientInput & { id?: string }): ApiResult<any>;
  deleteClient(id: string): ApiResult<boolean>;
  listDrivers(): ApiResult<any[]>;
  saveDriver(input: DriverInput & { id?: string }): ApiResult<any>;
  deleteDriver(id: string): ApiResult<boolean>;
  listVehicles(): ApiResult<any[]>;
  saveVehicle(input: VehicleInput & { id?: string }): ApiResult<any>;
  deleteVehicle(id: string): ApiResult<boolean>;
  listUsers(): ApiResult<any[]>;
  saveUser(input: UserInput & { id?: string }): ApiResult<any>;
  deleteUser(id: string): ApiResult<boolean>;
  listEmployees(clientId?: string): ApiResult<any[]>;
  importEmployees(payload: ImportPayload): ApiResult<{ importJob: any; employees: any[] }>;
  listImportTemplates(clientId: string): ApiResult<any[]>;
  saveImportTemplate(input: ImportTemplateInput): ApiResult<any>;
  listRoutes(): ApiResult<any[]>;
  saveRoute(input: RouteDraftInput & { id?: string }): ApiResult<any>;
  saveRouteBatch(input: RouteBatchInput): ApiResult<any[]>;
  createBackup(): ApiResult<BackupResult>;
  getBackupSettings(): ApiResult<BackupSettings>;
  chooseBackupDirectory(): ApiResult<{ directory?: string }>;
  restoreBackup(): ApiResult<RestoreBackupResult>;
  exportDataPackage(): ApiResult<DataExportPackageResult>;
  listAuditLogs(): ApiResult<any[]>;
  checkForUpdates(): ApiResult<UpdateCheckResult>;
  downloadAndInstallUpdate(): ApiResult<UpdateInstallResult>;
};
