import api, { unwrap } from './axios.js';


export const getBuildingPayments = (buildingId, limit = 5) =>
  unwrap(api.get(`/buildings/${buildingId}/payments`, { params: { limit } }));
