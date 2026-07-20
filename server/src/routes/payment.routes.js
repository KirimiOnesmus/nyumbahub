'use strict';

const { Router } = require('express');
const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { attachBuildingScope, requireBuildingAccess } = require('../middleware/buildingScope.middleware');
const { stkPushLimiter, paymentStatusLimiter } = require('../middleware/rateLimit.middleware');
const { ROLES } = require('../config/constants');
const { idParamSchema } = require('../utils/validators/common.validators');
const {
  paymentTokenParamSchema,
  initiatePaymentBodySchema,
  paymentStatusParamSchema,
  buildingIdParamSchema,
  listBuildingPaymentsQuerySchema,
} = require('../utils/validators/payment.validators');

const router = Router();

router.post(
  '/public/bill-payments/:token/pay',
  stkPushLimiter,
  validate({ params: paymentTokenParamSchema, body: initiatePaymentBodySchema }),
  paymentController.initiatePayment
);

router.get(
  '/public/bill-payments/:token/payment-status/:paymentId',
  paymentStatusLimiter,
  validate({ params: paymentStatusParamSchema }),
  paymentController.getPaymentStatus
);

router.get(
  '/bills/:id/payments',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  validate({ params: idParamSchema }),
  paymentController.listBillPayments
);

router.get(
  '/buildings/:buildingId/payments',
  requireAuth,
  requireRole(ROLES.OWNER, ROLES.CARETAKER, ROLES.ADMIN),
  attachBuildingScope,
  requireBuildingAccess('buildingId'),
  validate({ params: buildingIdParamSchema, query: listBuildingPaymentsQuerySchema }),
  paymentController.listBuildingPayments
);

module.exports = router;