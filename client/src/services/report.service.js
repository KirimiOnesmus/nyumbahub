import api, { unwrap } from './axios.js';

export const getPortfolioReport = (period) =>
  unwrap(api.get('/reports/portfolio', { params: period ? { period } : {} }));


export const getRevenueTrend = (months) =>
  unwrap(api.get('/reports/portfolio/trend', { params: months ? { months } : {} }));


/**
 * GET /reports/building/:buildingId — pass `period` ('YYYY-MM') to scope
 * totalBilled/totalCollected/outstandingBalance to that month; omit for
 * all-time totals. totalUnits, occupiedUnits, vacantUnits, activeTenants,
 * pendingTenants, unpaidBills, overdueCount, and overdueAmount always
 * reflect the building's *current* state regardless of the period passed.
 */
export const getBuildingReport = (buildingId, period) =>
  unwrap(api.get(`/reports/building/${buildingId}`, { params: period ? { period } : {} }));

export const getOverdueTenants = (buildingId) =>
  unwrap(api.get(`/reports/building/${buildingId}/overdue-tenants`));