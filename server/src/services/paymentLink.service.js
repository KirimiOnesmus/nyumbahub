'use strict';

const crypto = require('crypto');

const Bill = require('../models/Bill');
const Unit = require('../models/Unit');
const PaymentLink = require('../models/PaymentLink');
const env = require('../config/env');
const {
  BILL_TYPE,
  BILL_STATUS,
  BILL_TYPE_LABELS,
  PAYMENT_LINK_TOKEN_BYTES,
  PAYMENT_LINK_NONRENT_TTL_DAYS,
} = require('../config/constants');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SETTLED_STATUSES = new Set([
  BILL_STATUS.PAID,
  BILL_STATUS.PAID_EARLY,
  BILL_STATUS.PAID_LATE,
]);

function generateRawToken() {
  return crypto.randomBytes(PAYMENT_LINK_TOKEN_BYTES).toString('hex');
}

function isLinkStillValid(bill, link) {
  if (!bill || !link) return false;
  if (SETTLED_STATUSES.has(bill.status)) return false;

  if (bill.type === BILL_TYPE.RENT) {
    const endOfDueDateDay = new Date(bill.dueDate).getTime() + MS_PER_DAY - 1;
    return Date.now() <= endOfDueDateDay;
  }

  const nonRentCutoff =
    new Date(link.createdAt).getTime() + PAYMENT_LINK_NONRENT_TTL_DAYS * MS_PER_DAY;
  return Date.now() <= nonRentCutoff;
}

async function issuePaymentLink(billId) {
  const rawToken = generateRawToken();
  const tokenHash = PaymentLink.hashToken(rawToken);

  await PaymentLink.findOneAndUpdate(
    { billId },
    { $set: { tokenHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return rawToken;
}

async function validatePaymentLink(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = PaymentLink.hashToken(rawToken);
  const link = await PaymentLink.findOne({ tokenHash }).select('billId createdAt');
  if (!link) {
    return null;
  }

  const bill = await Bill.findById(link.billId);
  if (!bill) {
    return null; 
  }

  if (!isLinkStillValid(bill, link)) {
    return null;
  }

  const unit = await Unit.findById(bill.unitId).populate('buildingId', 'name').select('unitNumber buildingId');

  return {
    type: bill.type,
    period: bill.period,
    amount: bill.amount,
    amountPaid: bill.amountPaid,
    balance: Math.round((bill.amount - bill.amountPaid) * 100) / 100,
    dueDate: bill.dueDate,
    status: bill.status, 
    buildingName: unit?.buildingId?.name ?? null,
    unitLabel: unit?.unitNumber ?? null,
    description: `${BILL_TYPE_LABELS[bill.type]} — ${bill.period}`,
  };
}

async function resolveBillForToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = PaymentLink.hashToken(rawToken);
  const link = await PaymentLink.findOne({ tokenHash }).select('billId createdAt');
  if (!link) return null;

  const bill = await Bill.findById(link.billId);
  if (!bill) return null;
  if (!isLinkStillValid(bill, link)) return null;

  return bill;
}


async function resolveBillIdForToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const tokenHash = PaymentLink.hashToken(rawToken);
  const link = await PaymentLink.findOne({ tokenHash }).select('billId');
  return link ? link.billId : null;
}

function buildPaymentUrl(rawToken) {
  return `${env.APP_BASE_URL.replace(/\/$/, '')}/bill/${rawToken}`;
}

module.exports = {
  issuePaymentLink,
  validatePaymentLink,
  resolveBillForToken,
  resolveBillIdForToken,
  buildPaymentUrl,
  isLinkStillValid, 
};