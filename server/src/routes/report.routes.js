'use strict';
const { Router } = require('express');
const reportController = require('../controllers/report.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope, requireBuildingAccess } = require('../middleware/buildingScope.middleware');
const { ROLES } = require('../config/constants');
const {
  buildingIdParamSchema,
  reportQuerySchema,
  revenueTrendQuerySchema,
} = require('../utils/validators/report.validators');
const router = Router();

router.use(requireAuth, attachBuildingScope);

router.get(
  '/reports/portfolio',
  requireRole(ROLES.OWNER, ROLES.ADMIN),
  validate({ query: reportQuerySchema }),
  reportController.getPortfolioReport
);

router.get(
  '/reports/portfolio/trend',
  requireRole(ROLES.OWNER, ROLES.ADMIN),
  validate({ query: revenueTrendQuerySchema }),
  reportController.getRevenueTrend
);

router.get(
  '/reports/building/:buildingId',
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  requireBuildingAccess('buildingId'),
  validate({ params: buildingIdParamSchema, query: reportQuerySchema }),
  reportController.getBuildingReport
);

router.get(
  '/reports/building/:buildingId/overdue-tenants',
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  requireBuildingAccess('buildingId'),
  validate({ params: buildingIdParamSchema }),
  reportController.getOverdueTenants
);

module.exports = router;