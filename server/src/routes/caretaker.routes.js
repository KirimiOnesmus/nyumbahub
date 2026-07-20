'use strict';
const { Router } = require('express');
const caretakerController = require('../controllers/caretaker.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope } = require('../middleware/buildingScope.middleware');
const { ROLES } = require('../config/constants');
const { idParamSchema } = require('../utils/validators/common.validators');
const { credentialsResendLimiter } = require('../middleware/rateLimit.middleware');
const {
  createCaretakerSchema,
  updateCaretakerSchema,
  assignBuildingSchema,
  listCaretakersQuerySchema,
} = require('../utils/validators/caretaker.validators');

const router = Router();

// Every route here needs attachBuildingScope — even creation, since createCaretaker validates the requested buildingIds against the caller's own scope before assigning anything.

router.use('/caretakers', requireAuth, requireRole(ROLES.OWNER, ROLES.ADMIN), attachBuildingScope);

router.post('/caretakers', validate({ body: createCaretakerSchema }), caretakerController.createCaretaker);

router.post(
  '/caretakers/:id/resend-credentials',
  credentialsResendLimiter,
  validate({ params: idParamSchema }),
  caretakerController.resendCaretakerCredentials
);

router.get(
  '/caretakers',
  validate({ query: listCaretakersQuerySchema }),
  caretakerController.listCaretakers
);

router.get('/caretakers/:id', validate({ params: idParamSchema }), caretakerController.getCaretaker);

router.patch(
  '/caretakers/:id',
  validate({ params: idParamSchema, body: updateCaretakerSchema }),
  caretakerController.updateCaretaker
);

router.post(
  '/caretakers/:id/assign',
  validate({ params: idParamSchema, body: assignBuildingSchema }),
  caretakerController.assignBuilding
);

router.delete(
  '/caretakers/:id',
  validate({ params: idParamSchema }),
  caretakerController.deactivateCaretaker
);

module.exports = router;