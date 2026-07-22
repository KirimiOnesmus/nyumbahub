'use strict';

const paymentLinkService = require('../services/paymentLink.service');
const AppError = require('../utils/AppError'); 

async function getBillPayment(req, res, next) {
  try {
    const result = await paymentLinkService.validatePaymentLink(req.params.token);
    if (!result) {
      throw new AppError('This payment link is invalid or no longer active.', 404);
    }
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBillPayment };