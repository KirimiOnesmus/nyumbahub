import api, { unwrap } from './axios.js';

/** POST /caretakers — Owner, Admin. body: { name, phone, email?, buildingIds } */
export const createCaretaker = (payload) => unwrap(api.post('/caretakers', payload));

/** GET /caretakers — paginated */
export const listCaretakers = (params = {}) => unwrap(api.get('/caretakers', { params }));

/** GET /caretakers/:id — includes buildingIds */
export const getCaretaker = (id) => unwrap(api.get(`/caretakers/${id}`));

/** PATCH /caretakers/:id — name?, email?, isActive? */
export const updateCaretaker = (id, payload) => unwrap(api.patch(`/caretakers/${id}`, payload));

/** POST /caretakers/:id/assign — body: { buildingId } */ 
export const assignCaretakerToBuilding = (id, buildingId) =>
  unwrap(api.post(`/caretakers/${id}/assign`, { buildingId }));

/** DELETE /caretakers/:id — soft deactivate */
export const deactivateCaretaker = (id) => unwrap(api.delete(`/caretakers/${id}`));

// There is no single GET /caretakers/dashboard endpoint. Dashboard.jsx
// assembles its view from listBuildings() (scoped to the caretaker's own
// assignments), getBuildingReport(), getOverdueTenants(), and
// getBuildingPayments() — the same composition pattern the owner dashboard
// uses with getPortfolioReport().
