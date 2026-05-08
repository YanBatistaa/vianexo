# Contratos IPC

Fonte de verdade: `src/shared/ipc-contracts.ts`.

| Metodo renderer | Canal IPC | Permissao | Entrada | Retorno |
| --- | --- | --- | --- | --- |
| `bootstrap` | `app:bootstrap` | publica | `void` | `AppBootstrap` |
| `setupAdmin` | `setup:admin` | publica | `SetupAdminInput` | `{ id, name, email }` |
| `login` | `auth:login` | publica | `LoginInput` | `SessionUser` |
| `logout` | `auth:logout` | sessao | `void` | `boolean` |
| `listClients` | `clients:list` | `clients.view` | `void` | `Client[]` |
| `saveClient` | `clients:save` | `clients.create/edit` | `ClientInput & { id? }` | `Client` |
| `deleteClient` | `clients:delete` | `clients.delete` | `id` | `boolean` |
| `listDrivers` | `drivers:list` | `drivers.view` | `void` | `Driver[]` |
| `saveDriver` | `drivers:save` | `drivers.create/edit` | `DriverInput & { id? }` | `Driver` |
| `deleteDriver` | `drivers:delete` | `drivers.delete` | `id` | `boolean` |
| `listVehicles` | `vehicles:list` | `vehicles.view` | `void` | `Vehicle[]` |
| `saveVehicle` | `vehicles:save` | `vehicles.create/edit` | `VehicleInput & { id? }` | `Vehicle` |
| `deleteVehicle` | `vehicles:delete` | `vehicles.delete` | `id` | `boolean` |
| `listUsers` | `users:list` | `users.view` | `void` | `User[]` |
| `saveUser` | `users:save` | `users.create/edit` | `UserInput & { id? }` | `User` |
| `deleteUser` | `users:delete` | `users.delete` | `id` | `boolean` |
| `listEmployees` | `employees:list` | `employees.view` | `clientId?` | `Employee[]` |
| `importEmployees` | `employees:import` | `imports.create` | `ImportPayload` | `{ importJob, employees }` |
| `listImportTemplates` | `imports:templates:list` | `imports.view` | `clientId` | `ImportTemplate[]` |
| `saveImportTemplate` | `imports:templates:save` | `imports.create` | `ImportTemplateInput` | `ImportTemplate` |
| `listRoutes` | `routes:list` | `routes.view` | `void` | `Route[]` |
| `saveRoute` | `routes:save` | `routes.create/edit` | `RouteDraftInput & { id? }` | `Route` |
| `saveRouteBatch` | `routes:save-batch` | `routes.create/edit` | `RouteBatchInput` | `Route[]` |
| `createBackup` | `backup:create` | `settings.create` | `void` | `BackupResult` |
| `getBackupSettings` | `backup:settings` | `settings.view` | `void` | `BackupSettings` |
| `chooseBackupDirectory` | `backup:choose-directory` | `settings.edit` | `void` | `{ directory? }` |
| `restoreBackup` | `backup:restore` | `settings.edit` | `void` | `RestoreBackupResult` |
| `listAuditLogs` | `audit:list` | `settings.view` | `void` | `AuditLog[]` |
| `checkForUpdates` | `updates:check` | publica | `void` | `UpdateCheckResult` |
| `downloadAndInstallUpdate` | `updates:download-and-install` | publica | `void` | `UpdateInstallResult` |
