'use strict';

const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Unit = require('../models/Unit');
const TenantProfile = require('../models/TenantProfile');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { normalizeKenyanPhone } = require('../utils/phone');
const { determineSettlementStatus, isBuildingInScope } = require('./bill.service');
const { initiateStkPush } = require('./mpesa.service');
const paymentLinkService = require('./paymentLink.service');
const { hasAlreadyNotified, resolveTenantContact, recordNotificationResult } = require('./notificationDispatch.service');
const { sendBillMessageWithRetry } = require('./notification.service');
const { loadScopedBuilding } = require('../middleware/buildingScope.middleware');
const { trustedIn } = require('../utils/mongoSafe');
const {
  BILL_STATUS,
  BILL_TYPE_LABELS,
  PAYMENT_STATUS,
  NOTIFICATION_MESSAGE_TYPE,
} = require('../config/constants');

const SETTLED_STATUSES = new Set([BILL_STATUS.PAID, BILL_STATUS.PAID_EARLY, BILL_STATUS.PAID_LATE]);
const PENDING_PUSH_REUSE_WINDOW_MS = 2 * 60 * 1000; // matches typical Daraja STK prompt lifetime

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}


async function initiatePayment({ token, phone }) {
  const bill = await paymentLinkService.resolveBillForToken(token);
  if (!bill) throw AppError.notFound('This payment link is invalid or no longer active.');

  if (SETTLED_STATUSES.has(bill.status)) {
    throw AppError.conflict('This bill has already been paid.');
  }

  const existingPending = await Payment.findOne({ billId: bill._id, status: PAYMENT_STATUS.PENDING })
    .sort({ createdAt: -1 })
    .lean();
  if (existingPending && Date.now() - existingPending.createdAt.getTime() < PENDING_PUSH_REUSE_WINDOW_MS) {
    return { paymentId: existingPending._id.toString(), reused: true };
  }

  const normalizedPhone = normalizeKenyanPhone(phone);
  if (!normalizedPhone) {
    throw AppError.badRequest('Enter a valid Kenyan phone number, e.g. 0712345678');
  }

  const amount = roundMoney(bill.amount - bill.amountPaid);
  if (amount <= 0) {
    throw AppError.conflict('This bill has already been paid.');
  }

  const unit = await Unit.findById(bill.unitId).select('unitNumber');

  const stkResult = await initiateStkPush({
    phone: normalizedPhone,
    amount,
    accountReference: unit?.unitNumber || 'Payment',
    transactionDesc: BILL_TYPE_LABELS[bill.type],
  });

  const payment = await Payment.create({
    billId: bill._id,
    tenantId: bill.tenantId,
    amount,
    phone: normalizedPhone,
    checkoutRequestId: stkResult.checkoutRequestId,
    merchantRequestId: stkResult.merchantRequestId,
    status: PAYMENT_STATUS.PENDING,
  });

  logger.info(
    { paymentId: payment._id.toString(), billId: bill._id.toString() },
    'STK Push initiated'
  );

  return { paymentId: payment._id.toString(), reused: false };
}


async function getPaymentStatus({ token, paymentId }) {
  const billId = await paymentLinkService.resolveBillIdForToken(token);
  if (!billId) throw AppError.notFound('This payment link is invalid or no longer active.');

  const payment = await Payment.findOne({ _id: paymentId, billId }).select('status');
  if (!payment) throw AppError.notFound('Payment not found.');

  const status = payment.status === PAYMENT_STATUS.COMPLETED ? 'success' : payment.status;
  return { status };
}

function extractMetadataValue(callbackMetadata, name) {
  const item = (callbackMetadata?.Item || []).find((i) => i.Name === name);
  return item ? item.Value : null;
}

/** Daraja sends TransactionDate as an integer YYYYMMDDHHmmss, Nairobi local time (fixed UTC+3, no DST). */
function parseDarajaTransactionDate(value) {
  const s = String(value);
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}+03:00`;
  return new Date(iso);
}

async function dispatchPaymentConfirmedNotification(bill) {
  const alreadySent = await hasAlreadyNotified(bill.tenantId, bill._id, NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED);
  if (alreadySent) return;

  const contact = await resolveTenantContact(bill.tenantId);
  if (!contact) return;

  const result = await sendBillMessageWithRetry(contact.phone, NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED, {
    tenantName: contact.name,
    bill: { type: bill.type, amount: bill.amount, period: bill.period },
  });

  await recordNotificationResult({
    tenantId: bill.tenantId,
    billId: bill._id,
    messageType: NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED,
    result,
  });
}


async function handleMpesaCallback(payload) {
  const stkCallback = payload?.Body?.stkCallback;
  if (!stkCallback || !stkCallback.CheckoutRequestID) {
    logger.warn({ payload }, 'M-Pesa callback missing expected shape — ignored');
    return;
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });
  if (!payment) {
    logger.warn({ checkoutRequestId: CheckoutRequestID }, 'M-Pesa callback for unknown CheckoutRequestID — ignored');
    return;
  }
  if (payment.status !== PAYMENT_STATUS.PENDING) {
    logger.info(
      { paymentId: payment._id.toString(), status: payment.status },
      'M-Pesa callback for already-resolved payment — idempotent no-op'
    );
    return;
  }

  if (Number(ResultCode) !== 0) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.resultCode = Number(ResultCode);
    payment.resultDesc = ResultDesc;
    await payment.save();
    logger.info({ paymentId: payment._id.toString(), ResultCode, ResultDesc }, 'M-Pesa payment failed');
    return;
  }

  const mpesaReceiptNumber = extractMetadataValue(CallbackMetadata, 'MpesaReceiptNumber');
  const rawTransactionDate = extractMetadataValue(CallbackMetadata, 'TransactionDate');
  const transactionDate = rawTransactionDate ? parseDarajaTransactionDate(rawTransactionDate) : new Date();

  const session = await mongoose.startSession();
  try {
    let bill;
    await session.withTransaction(async () => {
      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.resultCode = 0;
      payment.resultDesc = ResultDesc;
      payment.mpesaReceiptNumber = mpesaReceiptNumber;
      payment.transactionDate = transactionDate;
      await payment.save({ session });

      bill = await Bill.findById(payment.billId).session(session);
      const newAmountPaid = roundMoney(bill.amountPaid + payment.amount);
      bill.amountPaid = newAmountPaid;

      if (newAmountPaid < bill.amount) {
        bill.status = BILL_STATUS.PARTIAL;
      } else {
        bill.status = determineSettlementStatus(transactionDate, bill.dueDate);
        bill.paidAt = transactionDate;
      }
      await bill.save({ session });
    });

    logger.info(
      { paymentId: payment._id.toString(), billId: bill._id.toString(), mpesaReceiptNumber },
      'M-Pesa payment completed, bill updated'
    );

    // Only on FULL settlement — a partial M-Pesa contribution doesn't merit
    // a "payment confirmed" message, only the bill's final settlement does.
    if (SETTLED_STATUSES.has(bill.status)) {
      dispatchPaymentConfirmedNotification(bill).catch((err) => {
        logger.error(
          { billId: bill._id.toString(), errorMessage: err.message },
          'Unexpected error dispatching payment-confirmed notification'
        );
      });
    }
  } finally {
    await session.endSession();
  }
}


async function listPaymentsForBill(req, billId) {
  const bill = await Bill.findById(billId).populate({ path: 'unitId', select: 'buildingId' });
  if (!bill) throw AppError.notFound('Bill not found.');
  if (!isBuildingInScope(req.buildingScope, bill.unitId.buildingId)) {
    throw AppError.notFound('Bill not found.');
  }

  const payments = await Payment.find({ billId }).sort({ createdAt: -1 }).lean();

  return payments.map((p) => ({
    id: p._id.toString(),
    amount: p.amount,
    phone: p.phone,
    status: p.status,
    mpesaReceiptNumber: p.mpesaReceiptNumber,
    resultDesc: p.resultDesc,
    transactionDate: p.transactionDate,
    createdAt: p.createdAt,
  }));
}

/**
 * Most recent COMPLETED (M-Pesa) payments across an entire building, newest
 * first — used by the dashboard's "Recent Payments" panel. Unlike
 * listPaymentsForBill (single bill), this fans out unit -> bill -> payment,
 * so it stays a few lean() queries joined in-memory rather than a driver-level
 * aggregation pipeline, consistent with the rest of this codebase.
 */
async function listRecentPaymentsForBuilding(req, buildingId, limit = 5) {
  const building = await loadScopedBuilding(req, buildingId);

  const units = await Unit.find({ buildingId: building._id, isArchived: false })
    .select('_id unitNumber')
    .lean();
  const unitIds = units.map((u) => u._id);
  const unitNumberById = new Map(units.map((u) => [u._id.toString(), u.unitNumber]));

  if (unitIds.length === 0) return [];

  const bills = await Bill.find({ unitId: trustedIn(unitIds) }).select('_id unitId').lean();
  const billIds = bills.map((b) => b._id);
  const unitIdByBill = new Map(bills.map((b) => [b._id.toString(), b.unitId.toString()]));

  if (billIds.length === 0) return [];

  const payments = await Payment.find({ billId: trustedIn(billIds), status: PAYMENT_STATUS.COMPLETED })
    .select('billId tenantId amount mpesaReceiptNumber transactionDate createdAt')
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const tenantIds = [...new Set(payments.map((p) => p.tenantId.toString()))];
  const tenantProfiles = await TenantProfile.find({ _id: trustedIn(tenantIds) })
    .populate('userId', 'name')
    .lean();
  const tenantNameById = new Map(tenantProfiles.map((tp) => [tp._id.toString(), tp.userId?.name ?? null]));

  return payments.map((p) => {
    const unitId = unitIdByBill.get(p.billId.toString());
    return {
      id: p._id.toString(),
      tenantId: p.tenantId.toString(),
      tenantName: tenantNameById.get(p.tenantId.toString()) ?? null,
      unitNumber: unitNumberById.get(unitId) ?? null,
      amount: p.amount,
      method: 'M-Pesa',
      mpesaReceiptNumber: p.mpesaReceiptNumber,
      paidOn: p.transactionDate || p.createdAt,
    };
  });
}

module.exports = {
  initiatePayment,
  getPaymentStatus,
  handleMpesaCallback,
  listPaymentsForBill,
  listRecentPaymentsForBuilding,
};