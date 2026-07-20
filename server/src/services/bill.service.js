'use strict';
const mongoose = require('mongoose');
const { trustedIn, trustedOp } = require('../utils/mongoSafe');
const Bill = require('../models/Bill');
const Unit = require('../models/Unit');
const TenantProfile = require('../models/TenantProfile');
const { issuePaymentLink, buildPaymentUrl } = require('./paymentLink.service');
const { sendBillMessageWithRetry } = require('./notification.service');
const {
  hasAlreadyNotified,
  resolveTenantContact, 
  recordNotificationResult,
} = require('./notificationDispatch.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { mapWithConcurrency } = require('../utils/concurrency');
const { nairobiPeriodString, nairobiDateOnlyString } = require('../utils/nairobiTime');
const {
  ROLES,
  BILL_TYPE,
  BILL_STATUS,
  TENANT_STATUS,
  NOTIFICATION_MESSAGE_TYPE,
  NOTIFICATION_SEND_CONCURRENCY,
  DEFAULT_PAGE_SIZE,
} = require('../config/constants');
const SETTLED_STATUSES = new Set([
  BILL_STATUS.PAID,
  BILL_STATUS.PAID_EARLY,
  BILL_STATUS.PAID_LATE,
]);
const GENERIC_NOT_FOUND = 'Bill not found.';
const GENERIC_TENANT_NOT_FOUND = 'Tenant not found or not currently active.';


// Scope + resolution helpers (pure logic where possible, so it's testable without a database connection)

function isBuildingInScope(buildingScope, buildingId) {
  if (!buildingScope) return false;
  if (buildingScope.unrestricted) return true;
  const target = buildingId.toString();
  return (buildingScope.buildingIds || []).some((id) => id.toString() === target);
}

function generatedByForRole(role) {
  switch (role) {
    case ROLES.CARETAKER:
      return 'caretaker';
    case ROLES.OWNER:
      return 'owner';
    case ROLES.ADMIN:
      return 'admin';
    default:
      throw AppError.badRequest('Unsupported role for bill creation.');
  }
}


function deriveDisplayStatus(bill) {
  if (SETTLED_STATUSES.has(bill.status)) {
    return BILL_STATUS.PAID;
  }
  if (new Date(bill.dueDate).getTime() < Date.now()) {
    return 'overdue';
  }
  return bill.status;
}


function determineSettlementStatus(paidAt, dueDate) {
  const paidDay = nairobiDateOnlyString(paidAt);
  const dueDay = nairobiDateOnlyString(dueDate);
  if (paidDay < dueDay) return BILL_STATUS.PAID_EARLY;
  if (paidDay === dueDay) return BILL_STATUS.PAID;
  return BILL_STATUS.PAID_LATE;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}


async function resolveActiveTenantUnitInScope(tenantId, buildingScope) {
  const tenantProfile = await TenantProfile.findById(tenantId);
  if (!tenantProfile || tenantProfile.status !== TENANT_STATUS.ACTIVE) {
    throw AppError.notFound(GENERIC_TENANT_NOT_FOUND);
  }

  const unit = await Unit.findById(tenantProfile.unitId);
  if (!unit || unit.isArchived) {
    throw AppError.notFound(GENERIC_TENANT_NOT_FOUND);
  }

  if (!isBuildingInScope(buildingScope, unit.buildingId)) {
    throw AppError.notFound(GENERIC_TENANT_NOT_FOUND);
  }

  return { tenantProfile, unit };
}

function actorFromReq(req) {

  return {
    userId: req.user.id,
    role: req.user.role,
    buildingScope: req.buildingScope,
  };
}

function assertNotRentType(type) {

  if (type === BILL_TYPE.RENT) {
    throw AppError.badRequest('Rent bills are system-generated only and cannot be created manually.');
  }
}


// Notification dispatch (best-effort, never blocks the caller)


async function dispatchManualBillNotification(bill) {
  const alreadySent = await hasAlreadyNotified(
    bill.tenantId,
    bill._id,
    NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED
  );
  if (alreadySent) return;

  const contact = await resolveTenantContact(bill.tenantId);
  if (!contact) return;

  const rawToken = await issuePaymentLink(bill._id);
  const paymentUrl = buildPaymentUrl(rawToken);

  const result = await sendBillMessageWithRetry(
    contact.phone,
    NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED,
    {
      tenantName: contact.name,
      bill: {
        type: bill.type,
        amount: bill.amount,
        amountPaid: bill.amountPaid,
        period: bill.period,
        dueDate: bill.dueDate,
      },
      paymentUrl,
    }
  );

  await recordNotificationResult({
    tenantId: bill.tenantId,
    billId: bill._id,
    messageType: NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED,
    result,
  });
}

function fireAndForgetNotification(bill) {
  dispatchManualBillNotification(bill).catch((err) => {
    logger.error(
      { billId: bill._id.toString(), errorMessage: err.message },
      'Unexpected error dispatching manual bill notification.'
    );
  });
}

// Exported service functions

async function createBill(req, input) {
  const actor = actorFromReq(req);
  assertNotRentType(input.type);

  const { tenantProfile, unit } = await resolveActiveTenantUnitInScope(
    input.tenantId,
    actor.buildingScope
  );

  const bill = await Bill.create({
    unitId: unit._id,
    tenantId: tenantProfile._id,
    type: input.type,
    amount: input.amount,
    period: nairobiPeriodString(),
    dueDate: input.dueDate,
    notes: input.notes,
    generatedBy: generatedByForRole(actor.role),
    createdBy: actor.userId,
  });

  fireAndForgetNotification(bill);

  return bill;
}


async function createBillsBulk(req, items) {
  const actor = actorFromReq(req);
  const resolved = [];
  for (const item of items) {
    assertNotRentType(item.type);
    const { tenantProfile, unit } = await resolveActiveTenantUnitInScope(
      item.tenantId,
      actor.buildingScope
    );
    resolved.push({ item, tenantProfile, unit });
  }

  const session = await mongoose.startSession();
  let createdBills;
  try {
    await session.withTransaction(async () => {
      const docs = resolved.map(({ item, tenantProfile, unit }) => ({
        unitId: unit._id,
        tenantId: tenantProfile._id,
        type: item.type,
        amount: item.amount,
        period: nairobiPeriodString(),
        dueDate: item.dueDate,
        notes: item.notes,
        generatedBy: generatedByForRole(actor.role),
        createdBy: actor.userId,
      }));
      createdBills = await Bill.insertMany(docs, { session, ordered: true });
    });
  } finally {
    await session.endSession();
  }

  mapWithConcurrency(createdBills, NOTIFICATION_SEND_CONCURRENCY, (bill) =>
    dispatchManualBillNotification(bill)
  ).catch((err) => {
    logger.error({ errorMessage: err.message }, 'Unexpected error in bulk bill notification dispatch.');
  });

  return createdBills;
}


async function listBillsForBuilding(req, buildingId, query) {
  const actor = actorFromReq(req);
  if (!isBuildingInScope(actor.buildingScope, buildingId)) {
    throw AppError.notFound('Building not found.');
  }

  const unitIds = await Unit.find({ buildingId, isArchived: false }).distinct('_id');

  const filter = { unitId: trustedIn(unitIds) };
  if (query.type) {
    filter.type = query.type;
  }
  if (query.status === 'overdue') {
    filter.status = trustedIn([BILL_STATUS.UNPAID, BILL_STATUS.PARTIAL]);
    filter.dueDate = trustedOp({ $lt: new Date() });
  } else if (query.status) {
    filter.status = query.status;
  }

  const page = query.page || 1;
  const limit = query.limit || DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Bill.find(filter)
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'unitId', select: 'unitNumber' })
      .populate({ path: 'tenantId', select: 'userId', populate: { path: 'userId', select: 'name' } })
      .lean(),
    Bill.countDocuments(filter),
  ]);

  const items = rows.map((bill) => ({
    id: bill._id.toString(),
    tenantName: bill.tenantId?.userId?.name ?? null,
    unit: bill.unitId?.unitNumber ?? null,
    type: bill.type,
    period: bill.period,
    amount: bill.amount,
    amountPaid: bill.amountPaid,
    balance: roundMoney(bill.amount - bill.amountPaid),
    dueDate: bill.dueDate,
    status: deriveDisplayStatus(bill),
  }));

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}


async function getBillById(req, billId) {
  const actor = actorFromReq(req);
  const bill = await Bill.findById(billId)
    .populate({ path: 'unitId', select: 'unitNumber buildingId' })
    .populate({ path: 'tenantId', select: 'userId', populate: { path: 'userId', select: 'name' } });

  if (!bill) {
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }
  if (!isBuildingInScope(actor.buildingScope, bill.unitId.buildingId)) {
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }

  return {
    id: bill._id.toString(),
    tenantName: bill.tenantId?.userId?.name ?? null,
    unit: bill.unitId?.unitNumber ?? null,
    type: bill.type,
    period: bill.period,
    amount: bill.amount,
    amountPaid: bill.amountPaid,
    balance: roundMoney(bill.amount - bill.amountPaid),
    dueDate: bill.dueDate,
    status: deriveDisplayStatus(bill),
    notes: bill.notes,
  };
}


async function markBillPaid(req, billId, input) {
  const actor = actorFromReq(req);
  const bill = await Bill.findById(billId).populate({ path: 'unitId', select: 'buildingId' });

  if (!bill) {
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }
  if (!isBuildingInScope(actor.buildingScope, bill.unitId.buildingId)) {
    throw AppError.notFound(GENERIC_NOT_FOUND);
  }

  if (SETTLED_STATUSES.has(bill.status)) {
    throw AppError.conflict('This bill has already been fully paid.');
  }

  const paidAt = input.paidAt || new Date();
  if (paidAt.getTime() < bill.createdAt.getTime()) {
    throw AppError.badRequest('paidAt cannot be before the bill was created.');
  }

  const newAmountPaid = roundMoney(bill.amountPaid + input.amountPaid);
  if (newAmountPaid > bill.amount) {
    throw AppError.badRequest('This payment would exceed the bill amount.');
  }

  bill.amountPaid = newAmountPaid;

  if (newAmountPaid < bill.amount) {
    bill.status = BILL_STATUS.PARTIAL;
    // paidAt intentionally left untouched — only set on full settlement.
  } else {
    bill.status = determineSettlementStatus(paidAt, bill.dueDate);
    bill.paidAt = paidAt;
  }

  await bill.save();

  return {
    id: bill._id.toString(),
    type: bill.type,
    period: bill.period,
    amount: bill.amount,
    amountPaid: bill.amountPaid,
    balance: roundMoney(bill.amount - bill.amountPaid),
    dueDate: bill.dueDate,
    paidAt: bill.paidAt,
    status: deriveDisplayStatus(bill),
  };
}

module.exports = {
  createBill,
  createBillsBulk,
  listBillsForBuilding,
  getBillById,
  markBillPaid,
  // exported for direct unit testing:
  isBuildingInScope,
  deriveDisplayStatus,
  determineSettlementStatus,
  generatedByForRole,
};