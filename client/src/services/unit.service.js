import api, { unwrap } from './axios.js';

export const createUnit = (buildingId, payload) =>
  unwrap(api.post(`/buildings/${buildingId}/units`, payload));


export const getUnits = (buildingId, params = {}) =>
  unwrap(api.get(`/buildings/${buildingId}/units`, { params }));


export const getUnitById = (id) => unwrap(api.get(`/units/${id}`));


export const updateUnit = (id, payload) => unwrap(api.patch(`/units/${id}`, payload));

export const createUnitInviteLink = (unitId) => unwrap(api.post(`/units/${unitId}/invite-link`));
