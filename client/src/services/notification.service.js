import api, { unwrap } from './axios.js';


export const createAnnouncement = (buildingId, message) =>
  unwrap(api.post(`/buildings/${buildingId}/announcements`, { message }));


export const getAnnouncements = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/announcements`, { params }));


export const sendAnnouncement = createAnnouncement;
export const listNotifications = getAnnouncements;


