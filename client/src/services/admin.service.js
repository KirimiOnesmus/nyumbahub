import api, { unwrap } from './axios.js';

// Super-admin-only actions that cut across the normal owner/caretaker
// resource boundaries. NOTE: like owner.service.js, these routes don't
// exist on the backend yet — this defines the contract the admin UI is
// built against so the server side has a clear target to implement.

/**
 * PATCH /admin/users/:id/phone — body: { phone }. Changes the login phone
 * number for any caretaker or owner account. The role-scoped endpoints
 * (/caretakers/:id, /owners/:id) deliberately reject phone changes because
 * phone doubles as the login identifier; this is the one place an admin
 * can repoint it — e.g. when someone loses access to their old SIM.
 */
export const changeUserPhone = (userId, phone) =>
  unwrap(api.patch(`/admin/users/${userId}/phone`, { phone: phone.trim() }));

/** GET /admin/overview — counts for the admin dashboard (owners, caretakers, buildings, tenants). */
export const getAdminOverview = () => unwrap(api.get('/admin/overview'));

/** GET /admin/system-config — platform-wide settings (SMS sender ID, support contact, etc.). */
export const getSystemConfig = () => unwrap(api.get('/admin/system-config'));

/** PATCH /admin/system-config — partial update of platform-wide settings. */
export const updateSystemConfig = (payload) => unwrap(api.patch('/admin/system-config', payload));

/**
 * PATCH /admin/users/:id/reset-password — forces a password reset for any
 * caretaker or owner account, same admin-only justification as
 * changeUserPhone above (e.g. the user is locked out and can't use the
 * normal "forgot password" flow). Expected response: { temporaryPassword },
 * a one-time password the admin hands to the user, who should change it via
 * the existing Security tab on next login. This route doesn't exist on the
 * backend yet — see the note at the top of this file.
 */
export const resetUserPassword = (userId) =>
  unwrap(api.patch(`/admin/users/${userId}/reset-password`));

/**
 * GET /admin/system-health — live status for the platform's core services
 * (API, database, SMS gateway, background jobs, etc.), used for the System
 * Activity page. Expected shape:
 * { services: [{ name, status: 'operational'|'degraded'|'down', latencyMs, lastCheckedAt }], uptime }
 */
export const getSystemHealth = () => unwrap(api.get('/admin/system-health'));

/**
 * GET /admin/activity-log — recent platform-wide events (logins, password
 * resets, phone changes, config updates, etc.) for the real-time activity
 * feed. Accepts { page, limit } query params. Expected shape:
 * { entries: [{ id, actor, action, target, createdAt }], page, limit, total }
 */
export const getActivityLog = (params) => unwrap(api.get('/admin/activity-log', { params }));
