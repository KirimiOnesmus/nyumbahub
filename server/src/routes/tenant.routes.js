'use strict';

const { Router } = require('express');
const tenantController = require('../controllers/tenant.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope } = require('../middleware/buildingScope.middleware');
const { inviteLinkLimiter } = require('../middleware/rateLimit.middleware');
const { ROLES } = require('../config/constants');
const { inviteTokenParamSchema, idParamSchema, paginationQuerySchema } = require('../utils/validators/common.validators');
const { onboardTenantSchema, createTenantDirectSchema } = require('../utils/validators/tenant.validators');

const router = Router();

//  Public — prospective tenant, not authenticated 
router.get(
  '/tenant-invites/:token',
  inviteLinkLimiter,
  validate({ params: inviteTokenParamSchema }),
  tenantController.getInviteInfo
);

router.post(
  '/tenant-invites/:token/onboard',
  inviteLinkLimiter,
  validate({ params: inviteTokenParamSchema, body: onboardTenantSchema }),
  tenantController.onboardViaInvite
);

//  Owner/Caretaker/Admin — direct-add, no invite involved 
router.post(
  '/tenants',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ body: createTenantDirectSchema }),
  tenantController.createTenantDirect
);

router.get(
  '/buildings/:buildingId/tenants',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ query: paginationQuerySchema }),
  tenantController.listTenants
);

router.get(
  '/tenants/:id',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ params: idParamSchema }),
  tenantController.getTenant
);

router.post(
  '/tenants/:id/move-out',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ params: idParamSchema }),
  tenantController.moveOutTenant
);

module.exports = router;