import { actions, modules, type PermissionGrant } from "../src/shared/contracts";
import { createFullPermissionMatrix, createViewOnlyPermissionMatrix, hasPermission } from "../src/shared/permissions";

function rows(matrix: ReturnType<typeof createFullPermissionMatrix>): PermissionGrant[] {
  return modules.flatMap((module) => (
    actions.map((action) => ({ module, action, allowed: matrix[module][action] }))
  ));
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const full = rows(createFullPermissionMatrix());
const viewOnly = rows(createViewOnlyPermissionMatrix());
const blockedClients = full.map((permission) => (
  permission.module === "clients" && permission.action === "delete"
    ? { ...permission, allowed: false }
    : permission
));

assert(hasPermission(undefined, "clients", "delete"), "Sem matriz deve manter compatibilidade com admin legado.");
assert(hasPermission(full, "routes", "create"), "Permissao total deve permitir criar rotas.");
assert(hasPermission(viewOnly, "clients", "view"), "Permissao somente leitura deve permitir visualizar clientes.");
assert(!hasPermission(viewOnly, "clients", "create"), "Permissao somente leitura nao deve criar clientes.");
assert(!hasPermission(blockedClients, "clients", "delete"), "Permissao negada deve bloquear exclusao.");
assert(hasPermission(full.filter((permission) => permission.module !== "settings"), "settings", "edit"), "Usuarios legados sem modulo settings devem manter compatibilidade.");
assert(!hasPermission(viewOnly, "settings", "edit"), "Somente leitura nao deve restaurar backup.");

console.log("Permissions test ok.");
