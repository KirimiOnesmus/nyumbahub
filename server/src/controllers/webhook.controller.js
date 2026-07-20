'use strict';
const paymentService = require('../services/payment.service');
const logger = require('../utils/logger');
async function mpesaCallback(req, res) {
  try {
    await paymentService.handleMpesaCallback(req.body);
  } catch (err) {
    logger.error({ err: err.message }, 'Unexpected error processing M-Pesa callback');
  }
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

module.exports = { mpesaCallback };