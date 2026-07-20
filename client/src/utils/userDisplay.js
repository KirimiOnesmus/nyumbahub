// Presentation-only helpers for rendering the authenticated user in chrome
// (Navbar/Sidebar). Never derive authorization decisions from this file —
// role-based access is enforced by ProtectedRoute (client) and the API
// (server); this module only decides what text/initials to paint.

const ROLE_LABELS = {
  admin: 'Administrator',
  owner: 'Owner Account',
  caretaker: 'Caretaker',
  tenant: 'Tenant',
};

/** Human-readable label for a role. Falls back safely for unknown/missing roles. */
export const getRoleLabel = (role) => ROLE_LABELS[role] || 'Account';

/**
 * Up to two initials from a display name. Defensive against missing/blank
 * names so a malformed or not-yet-loaded user object can't crash the shell.
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};
