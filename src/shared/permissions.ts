import { actions, modules, type PermissionAction, type PermissionGrant, type PermissionMatrix, type PermissionModule } from "./contracts";

export function createFullPermissionMatrix(): PermissionMatrix {
  return modules.reduce((matrix, moduleName) => {
    matrix[moduleName] = actions.reduce((moduleActions, action) => {
      moduleActions[action] = true;
      return moduleActions;
    }, {} as PermissionMatrix[typeof moduleName]);
    return matrix;
  }, {} as PermissionMatrix);
}

export function createViewOnlyPermissionMatrix(): PermissionMatrix {
  return modules.reduce((matrix, moduleName) => {
    matrix[moduleName] = actions.reduce((moduleActions, action) => {
      moduleActions[action] = action === "view";
      return moduleActions;
    }, {} as PermissionMatrix[typeof moduleName]);
    return matrix;
  }, {} as PermissionMatrix);
}

export function hasPermission(permissions: PermissionGrant[] | undefined, module: PermissionModule, action: PermissionAction) {
  if (!permissions || permissions.length === 0) return true;
  if (!permissions.some((permission) => permission.module === module)) return true;
  return permissions.some((permission) => permission.module === module && permission.action === action && permission.allowed);
}
