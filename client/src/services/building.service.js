import api, { unwrap } from './axios.js';

/** GET /buildings — Owner/Admin, paginated */
export const listBuildings = (params = {}) => unwrap(api.get('/buildings', { params }));

/** GET /buildings/:id */
export const getBuilding = (id) => unwrap(api.get(`/buildings/${id}`));

export const getBuildings = (params = {}) => unwrap(api.get('/buildings', { params }));


/** POST /buildings — Owner only. Bulk-creates units transactionally via unitTypes. */
export const createBuilding = (payload) => unwrap(api.post('/buildings', payload));

/** PATCH /buildings/:id — name/address only */
export const updateBuilding = (id, payload) => unwrap(api.patch(`/buildings/${id}`, payload));

/** DELETE /buildings/:id — soft archive */
export const deleteBuilding = (id) => unwrap(api.delete(`/buildings/${id}`));
 