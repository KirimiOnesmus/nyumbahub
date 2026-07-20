'use strict';

const { Router } = require('express');
const unitController = require('../controllers/unit.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope, requireBuildingAccess } = require('../middleware/buildingScope.middleware');
const { inviteLinkLimiter } = require('../middleware/rateLimit.middleware');
const { ROLES } = require('../config/constants');
const { idParamSchema } = require('../utils/validators/common.validators');
const { createUnitSchema, updateUnitSchema, listUnitsQuerySchema } = require('../utils/validators/unit.validators');
const tenantController = require('../controllers/tenant.controller');

const router = Router();

router.use(
  ['/units', '/buildings/:buildingId/units'],
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope
);


router.post(
  '/buildings/:buildingId/units',
  requireBuildingAccess('buildingId'),
  validate({ body: createUnitSchema }),
  unitController.createUnit
);

router.get(
  '/buildings/:buildingId/units',
  requireBuildingAccess('buildingId'),
  validate({ query: listUnitsQuerySchema }),
  unitController.listUnits
);


router.get('/units/:id', validate({ params: idParamSchema }), unitController.getUnit);

router.patch(
  '/units/:id',
  validate({ params: idParamSchema, body: updateUnitSchema }),
  unitController.updateUnit
);

router.post(
  '/units/:id/invite-link',
  inviteLinkLimiter,
  validate({ params: idParamSchema }),
  tenantController.createInviteLink
);

module.exports = router;