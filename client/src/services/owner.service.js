import api, { unwrap } from './axios.js';


export const createOwner = (payload) => unwrap(api.post('/owners', payload));

export const listOwners = (params = {}) => unwrap(api.get('/owners', { params }));

export const getOwner = (id) => unwrap(api.get(`/owners/${id}`));

export const updateOwner = (id, payload) => unwrap(api.patch(`/owners/${id}`, payload));

export const deactivateOwner = (id) => unwrap(api.delete(`/owners/${id}`));
