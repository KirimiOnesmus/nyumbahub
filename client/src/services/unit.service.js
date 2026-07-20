import api, { unwrap } from './axios.js';

/** POST /buildings/:buildingId/units — Owner, Caretaker, Admin */
export const createUnit = (buildingId, payload) =>
  unwrap(api.post(`/buildings/${buildingId}/units`, payload));

/** GET /buildings/:buildingId/units — paginated */
export const getUnits = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/units`, { params }));

/** GET /units/:id */
export const getUnitById = (id) => unwrap(api.get(`/units/${id}`));

/** PATCH /units/:id — unitNumber?, type?, monthlyRent?, status? */
export const updateUnit = (id, payload) => unwrap(api.patch(`/units/${id}`, payload));

/**
 * POST /units/:id/invite-link — generates a tenant self-onboarding link for
 * a vacant unit. Only call this for units with status === 'vacant'; the 
 * backend rejects occupied units with 409 CONFLICT.
 */
export const createUnitInviteLink = (unitId) => unwrap(api.post(`/units/${unitId}/invite-link`));
