import api, { unwrap } from './axios.js';

// Owner-account management — Admin only. Distinct from a "Building" owner
// relationship: this is the user account itself (login, contact info,
// active/inactive status). Mirrors the shape of caretaker.service.js so the
// two feel consistent to work with.

/** POST /owners — Admin only. body: { name, phone, email? } */
export const createOwner = (payload) => unwrap(api.post('/owners', payload));

/** GET /owners — Admin only, paginated. */
export const listOwners = (params = {}) => unwrap(api.get('/owners', { params }));

/** GET /owners/:id — includes buildingIds owned by this owner. */
export const getOwner = (id) => unwrap(api.get(`/owners/${id}`));

/** PATCH /owners/:id — name?, email?, isActive?. Phone is intentionally
 *  excluded here, same as caretakers — use admin.service.js's
 *  changeUserPhone for that, since phone doubles as the login identifier. */
export const updateOwner = (id, payload) => unwrap(api.patch(`/owners/${id}`, payload));

/** DELETE /owners/:id — soft deactivate, does not delete their buildings. */
export const deactivateOwner = (id) => unwrap(api.delete(`/owners/${id}`));
