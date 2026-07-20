import api, { unwrap } from './axios.js';

export const createAnnouncement = (buildingId, message) =>
  unwrap(api.post(`/buildings/${buildingId}/announcements`, { message }));
export const sendDirectAnnouncement = (buildingId, tenantId, message) =>
  unwrap(api.post(`/buildings/${buildingId}/tenants/${tenantId}/announcements`, { message }));
export const listAnnouncements = (buildingId, { page = 1, limit = 20 } = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/announcements`, { params: { page, limit } }));