import api, { unwrap } from './axios.js';

/**
 * POST /expenses — Caretaker/Owner/Admin, scoped to a building the caller
 * has access to. Never send loggedBy/loggedByRole — the backend derives
 * those from the authenticated user and its .strict() schema rejects them.
 */
export const createExpense = (payload) => unwrap(api.post('/expenses', payload));

/**
 * GET /buildings/:buildingId/expenses — paginated. The backend silently
 * scopes the result set to the caller: a caretaker only ever sees the
 * expenses they personally logged for this building; an owner/admin sees
 * every caretaker's entries. No client-side filtering can widen or narrow
 * this — it's enforced server-side.
 */
export const getExpenses = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/expenses`, { params }));

/** GET /expenses/:id */
export const getExpenseById = (id) => unwrap(api.get(`/expenses/${id}`));
