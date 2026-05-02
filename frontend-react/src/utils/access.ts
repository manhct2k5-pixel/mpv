export const normalizeRoleForAccess = (role?: string | null) => {
  const normalized = role?.trim().toLowerCase() ?? '';
  return normalized === 'styles' ? 'warehouse' : normalized;
};

export const canUseShoppingFlow = (role?: string | null) =>
  normalizeRoleForAccess(role) === 'user';

export const isCustomerRole = (role?: string | null) => normalizeRoleForAccess(role) === 'user';
