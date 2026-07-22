import api, { unwrap } from './axios.js';

export const listBuildings = (params = {}) => unwrap(api.get('/buildings', { params }));


export const getBuilding = (id) => unwrap(api.get(`/buildings/${id}`));

export const getBuildings = (params = {}) => unwrap(api.get('/buildings', { params }));


export const createBuilding = (payload) => unwrap(api.post('/buildings', payload));

export const updateBuilding = (id, payload) => unwrap(api.patch(`/buildings/${id}`, payload));

export const deleteBuilding = (id) => unwrap(api.delete(`/buildings/${id}`));
 