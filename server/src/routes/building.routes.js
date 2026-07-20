'use strict';

const { Router } = require('express');
const buildingController = require('../controllers/building.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope } = require('../middleware/buildingScope.middleware');
const { ROLES } = require('../config/constants');
const { idParamSchema } = require('../utils/validators/common.validators');
const {
  createBuildingSchema,
  updateBuildingSchema,
  listBuildingsQuerySchema,
} = require('../utils/validators/building.validators');

const router = Router();

// Building creation is Owner-only — Admin has override visibility on  existing buildings , but does not create buildings on an Owner's behalf. 

router.post( 
  '/buildings',
  requireAuth,
  requireRole(ROLES.OWNER),
  validate({ body: createBuildingSchema }),
  buildingController.createBuilding
);

router.get(
  '/buildings',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.CARETAKER),
  attachBuildingScope,
  validate({ query: listBuildingsQuerySchema }),
  buildingController.listBuildings
);

router.get(
  '/buildings/:id',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.CARETAKER),
  attachBuildingScope,
  validate({ params: idParamSchema }),
  buildingController.getBuilding
);

router.patch(
  '/buildings/:id',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ params: idParamSchema, body: updateBuildingSchema }),
  buildingController.updateBuilding
);

router.delete(
  '/buildings/:id',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ params: idParamSchema }),
  buildingController.archiveBuilding
);

module.exports = router;