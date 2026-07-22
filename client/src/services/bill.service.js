import api, { unwrap } from './axios.js';


export const createBill = (payload) => unwrap(api.post('/bills', payload));


export const createBillsBulk = (bills) => unwrap(api.post('/bills/bulk', bills));


export const getBills = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/bills`, { params }));

export const getBill = (id) => unwrap(api.get(`/bills/${id}`));


export const markBillPaid = (id, payload) => unwrap(api.post(`/bills/${id}/mark-paid`, payload));


export const getBillPayments = (id) => unwrap(api.get(`/bills/${id}/payments`));
