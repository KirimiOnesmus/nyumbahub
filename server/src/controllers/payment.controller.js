'use strict';

const paymentService = require('../services/payment.service');

async function initiatePayment(req, res, next) {
  try {
    const result = await paymentService.initiatePayment({
      token: req.params.token,
      phone: req.body.phone,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getPaymentStatus(req, res, next) {
  try {
    const result = await paymentService.getPaymentStatus({
      token: req.params.token,
      paymentId: req.params.paymentId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listBillPayments(req, res, next) {
  try {
    const payments = await paymentService.listPaymentsForBill(req, req.params.id);
    res.status(200).json({ success: true, data: { payments } });
  } catch (err) {
    next(err);
  }
}

async function listBuildingPayments(req, res, next) {
  try {
    const payments = await paymentService.listRecentPaymentsForBuilding(
      req,
      req.params.buildingId,
      req.query.limit
    );
    res.status(200).json({ success: true, data: { payments } });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiatePayment, getPaymentStatus, listBillPayments, listBuildingPayments };