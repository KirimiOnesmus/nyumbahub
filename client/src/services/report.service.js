import api, { unwrap } from './axios.js';

export const getPortfolioReport = (period) =>
  unwrap(api.get('/reports/portfolio', { params: period ? { period } : {} }));


export const getRevenueTrend = (months) =>
  unwrap(api.get('/reports/portfolio/trend', { params: months ? { months } : {} }));


export const getBuildingReport = (buildingId, period) =>
  unwrap(api.get(`/reports/building/${buildingId}`, { params: period ? { period } : {} }));

export const getOverdueTenants = (buildingId) =>
  unwrap(api.get(`/reports/building/${buildingId}/overdue-tenants`));