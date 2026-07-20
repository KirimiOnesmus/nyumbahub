'use strict';

const { Router } = require('express');
const billController = require('../controllers/bill.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope, requireBuildingAccess } = require('../middleware/buildingScope.middleware');
const { ROLES } = require('../config/constants');
const {
  createBillSchema,
  createBillsBulkSchema,
  buildingIdParamSchema,
  billIdParamSchema,
  listBillsQuerySchema,
  markPaidSchema,
} = require('../utils/validators/bill.validators');

const router = Router();

router.use(requireAuth, requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN), attachBuildingScope);

router.post('/bills', validate({ body: createBillSchema }), billController.createBill);

router.post('/bills/bulk', validate({ body: createBillsBulkSchema }), billController.createBillsBulk);

router.get(
  '/buildings/:buildingId/bills',
  requireBuildingAccess('buildingId'),
  validate({ params: buildingIdParamSchema, query: listBillsQuerySchema }),
  billController.listBills
);

router.get('/bills/:id', validate({ params: billIdParamSchema }), billController.getBill);

router.post(
  '/bills/:id/mark-paid',
  validate({ params: billIdParamSchema, body: markPaidSchema }),
  billController.markBillPaid
);

module.exports = router;