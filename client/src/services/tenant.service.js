import api, { unwrap } from './axios.js';

// ---- Authenticated management (Owner/Caretaker/Admin) ----

/** POST /tenants — direct-add, no invite. NEVER send monthlyRent — rent lives on the Unit only and the backend's .strict() schema rejects it. */
export const createTenant = (payload) => unwrap(api.post('/tenants', payload));

/** GET /buildings/:buildingId/tenants — paginated */
export const getTenants = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/tenants`, { params }));

/** GET /tenants/:id — :id is the TenantProfile id, NOT the tenant's User id */
export const getTenantById = (id) => unwrap(api.get(`/tenants/${id}`));

/** POST /tenants/:id/move-out — marks the unit vacant */
export const moveOutTenant = (id) => unwrap(api.post(`/tenants/${id}/move-out`));

/** POST /units/:unitId/invite-link — generates a self-onboarding link for a vacant unit */
export const createTenantInvite = (unitId) => unwrap(api.post(`/units/${unitId}/invite-link`));

// ---- Public, token-gated (no auth — the token itself is the credential) ----

/** GET /tenant-invites/:token */
export const getInviteLink = (token) => unwrap(api.get(`/tenant-invites/${token}`));

/** POST /tenant-invites/:token/onboard — body: { fullName, phone, email?, idType, idNumber } */
export const onboardTenant = (token, payload) =>
  unwrap(api.post(`/tenant-invites/${token}/onboard`, payload));

// ---- Public bill view + M-Pesa payment (token-gated) ----
// The token alone identifies the bill; there is no separate billId concept
// on the backend for this flow (see GET /public/bill-payments/:token).

/** GET /public/bill-payments/:token */
export const getBill = (token) => unwrap(api.get(`/public/bill-payments/${token}`));

/**
 * POST /public/bill-payments/:token/pay — body: { phone } only. The backend
 * always computes the charge itself from the bill's current balance; never
 * send an amount, it will be ignored (or rejected — the schema is .strict()).
 * `reused: true` in the response means an identical push was already in
 * flight (e.g. a double-click) — treat it the same as a fresh initiation.
 */
export const initiateStkPush = (token, phone) =>
  unwrap(api.post(`/public/bill-payments/${token}/pay`, { phone }));

/** GET /public/bill-payments/:token/payment-status/:paymentId — poll every ~3s while pending */
export const getPaymentStatus = (token, paymentId) =>
  unwrap(api.get(`/public/bill-payments/${token}/payment-status/${paymentId}`));
 