import api, { unwrap } from './axios.js';

export const createCaretaker = (payload) => unwrap(api.post('/caretakers', payload));

export const listCaretakers = (params = {}) => unwrap(api.get('/caretakers', { params }));

export const getCaretaker = (id) => unwrap(api.get(`/caretakers/${id}`));

export const updateCaretaker = (id, payload) => unwrap(api.patch(`/caretakers/${id}`, payload));
 
export const assignCaretakerToBuilding = (id, buildingId) =>
  unwrap(api.post(`/caretakers/${id}/assign`, { buildingId }));

export const deactivateCaretaker = (id) => unwrap(api.delete(`/caretakers/${id}`));

