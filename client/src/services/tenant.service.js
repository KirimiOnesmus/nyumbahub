import api, { unwrap } from './axios.js';


export const createTenant = (payload) => unwrap(api.post('/tenants', payload));

export const getTenants = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/tenants`, { params }));


export const getTenantById = (id) => unwrap(api.get(`/tenants/${id}`));


export const moveOutTenant = (id) => unwrap(api.post(`/tenants/${id}/move-out`));

export const createTenantInvite = (unitId) => unwrap(api.post(`/units/${unitId}/invite-link`));

export const getInviteLink = (token) => unwrap(api.get(`/tenant-invites/${token}`));


export const onboardTenant = (token, payload) =>
  unwrap(api.post(`/tenant-invites/${token}/onboard`, payload));


export const getBill = (token) => unwrap(api.get(`/public/bill-payments/${token}`));


export const initiateStkPush = (token, phone) =>
  unwrap(api.post(`/public/bill-payments/${token}/pay`, { phone }));

export const getPaymentStatus = (token, paymentId) =>
  unwrap(api.get(`/public/bill-payments/${token}/payment-status/${paymentId}`));
 