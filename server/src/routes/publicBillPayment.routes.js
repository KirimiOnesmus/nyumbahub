'use strict';

const { Router } = require('express');
const publicBillPaymentController = require('../controllers/publicBillPayment.controller');
const { validate } = require('../middleware/validate.middleware');
const { billPaymentLinkLimiter } = require('../middleware/rateLimit.middleware');
const { inviteTokenParamSchema } = require('../utils/validators/common.validators');

const router = Router();


router.get(
  '/public/bill-payments/:token',
  billPaymentLinkLimiter,
  validate({ params: inviteTokenParamSchema }),
  publicBillPaymentController.getBillPayment
);

module.exports = router;