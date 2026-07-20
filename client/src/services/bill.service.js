import api, { unwrap } from './axios.js';

/** POST /bills — Owner, Caretaker, Admin. type is one of water|electricity|garbage|serviceCharge|other (rent is system-generated only, rejected here). */
export const createBill = (payload) => unwrap(api.post('/bills', payload));

/** POST /bills/bulk — array of the above, max 100, all-or-nothing */
export const createBillsBulk = (bills) => unwrap(api.post('/bills/bulk', bills));

/** GET /buildings/:buildingId/bills — paginated, filterable by status/type. Pass status: 'overdue' for the derived overdue view. */
export const getBills = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/bills`, { params }));

/** GET /bills/:id */
export const getBill = (id) => unwrap(api.get(`/bills/${id}`));

/** POST /bills/:id/mark-paid — manual/cash reconciliation. body: { amountPaid, paidAt? } */
export const markBillPaid = (id, payload) => unwrap(api.post(`/bills/${id}/mark-paid`, payload));

/** GET /bills/:id/payments — full M-Pesa transaction history for a bill */
export const getBillPayments = (id) => unwrap(api.get(`/bills/${id}/payments`));
