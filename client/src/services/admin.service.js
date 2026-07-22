import api, { unwrap } from './axios.js';



export const changeUserPhone = (userId, phone) =>
  unwrap(api.patch(`/admin/users/${userId}/phone`, { phone: phone.trim() }));


export const getAdminOverview = () => unwrap(api.get('/admin/overview'));


export const getSystemConfig = () => unwrap(api.get('/admin/system-config'));


export const updateSystemConfig = (payload) => unwrap(api.patch('/admin/system-config', payload));

export const resetUserPassword = (userId) =>
  unwrap(api.patch(`/admin/users/${userId}/reset-password`));


export const getSystemHealth = () => unwrap(api.get('/admin/system-health'));

export const getActivityLog = (params) => unwrap(api.get('/admin/activity-log', { params }));
