import { actions, modules, type PermissionMatrix } from "./contracts";

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
