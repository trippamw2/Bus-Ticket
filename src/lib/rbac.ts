// Role-Based Access Control (RBAC) for Operator App

export type OperatorRole = 'owner' | 'manager' | 'operations' | 'finance' | 'agent';

export interface RolePermission {
  canManageUsers: boolean;
  canManageFleet: boolean;
  canManageRoutes: boolean;
  canManageTrips: boolean;
  canViewFinancials: boolean;
  canManageFinancials: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canViewAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<OperatorRole, RolePermission> = {
  owner: {
    canManageUsers: true,
    canManageFleet: true,
    canManageRoutes: true,
    canManageTrips: true,
    canViewFinancials: true,
    canManageFinancials: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canViewAuditLogs: true,
  },
  manager: {
    canManageUsers: true,
    canManageFleet: true,
    canManageRoutes: true,
    canManageTrips: true,
    canViewFinancials: true,
    canManageFinancials: false,
    canViewAnalytics: true,
    canManageSettings: true,
    canViewAuditLogs: true,
  },
  operations: {
    canManageUsers: false,
    canManageFleet: true,
    canManageRoutes: true,
    canManageTrips: true,
    canViewFinancials: false,
    canManageFinancials: false,
    canViewAnalytics: true,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
  finance: {
    canManageUsers: false,
    canManageFleet: false,
    canManageRoutes: false,
    canManageTrips: false,
    canViewFinancials: true,
    canManageFinancials: true,
    canViewAnalytics: true,
    canManageSettings: false,
    canViewAuditLogs: true,
  },
  agent: {
    canManageUsers: false,
    canManageFleet: false,
    canManageRoutes: false,
    canManageTrips: true,
    canViewFinancials: false,
    canManageFinancials: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canViewAuditLogs: false,
  },
};

export const ROLE_LABELS: Record<OperatorRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  operations: 'Operations',
  finance: 'Finance',
  agent: 'Agent',
};

export const ROLE_DESCRIPTIONS: Record<OperatorRole, string> = {
  owner: 'Full access to all features and settings',
  manager: 'Manage operations, users, and view analytics',
  operations: 'Manage fleet, routes, and trips',
  finance: 'View and manage financials and settlements',
  agent: 'Limited access to trip management only',
};

export function hasPermission(role: OperatorRole | null | undefined, permission: keyof RolePermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function canAccessRoute(role: OperatorRole | null | undefined, path: string): boolean {
  if (!role) return false;
  
  const permissions = ROLE_PERMISSIONS[role];
  
  if (path.includes('/organization')) return permissions.canManageUsers || permissions.canManageSettings;
  if (path.includes('/fleet')) return permissions.canManageFleet;
  if (path.includes('/routes')) return permissions.canManageRoutes;
  if (path.includes('/trips')) return permissions.canManageTrips;
  if (path.includes('/finance')) return permissions.canViewFinancials;
  if (path.includes('/wallet')) return permissions.canViewFinancials;
  if (path.includes('/analytics')) return permissions.canViewAnalytics;
  if (path.includes('/audit')) return permissions.canViewAuditLogs;
  
  return true;
}
