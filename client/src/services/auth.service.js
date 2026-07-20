import api, { unwrap } from './axios.js';


export const updateMe = (updates) => unwrap(api.patch('/auth/me', updates));

export const requestPasswordReset = (phone) =>
  unwrap(api.post('/auth/request-password-reset', { phone }));

export const resetPassword = (token, newPassword) =>
  unwrap(api.post('/auth/reset-password', { token, newPassword }));

export const changePassword = (currentPassword, newPassword) =>
  unwrap(api.post('/auth/change-password', { currentPassword, newPassword }));