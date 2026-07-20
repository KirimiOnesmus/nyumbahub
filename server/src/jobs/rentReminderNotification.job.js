"use strict";

const cron = require("node-cron");

const Bill = require("../models/Bill");

const {
  issuePaymentLink,
  buildPaymentUrl,
} = require("../services/paymentLink.service");
const {
  sendBillMessageWithRetry,
} = require("../services/notification.service");
const {
  hasAlreadyNotified,
  resolveTenantContact,
  recordNotificationResult,
} = require("../services/notificationDispatch.service");

const logger = require("../utils/logger");
const { nairobiPeriodString } = require("../utils/nairobiTime");
const {
  BILL_TYPE,
  BILL_STATUS,
  NOTIFICATION_MESSAGE_TYPE,
  NOTIFICATION_SEND_CONCURRENCY,
} = require("../config/constants");

const SETTLED_STATUSES = new Set([
  BILL_STATUS.PAID,
  BILL_STATUS.PAID_EARLY,
  BILL_STATUS.PAID_LATE,
]);

async function processCursorWithConcurrency(cursor, concurrency, worker) {
  const active = new Set();

  for await (const item of cursor) {
    const task = worker(item)
      .catch((err) => {
        logger.error(
          { errorMessage: err.message },
          "Unexpected error processing a rent reminder job item.",
        );
      })
      .finally(() => active.delete(task));

    active.add(task);

    if (active.size >= concurrency) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);
}

async function processRentBillReminder(bill) {
  const isSettled = SETTLED_STATUSES.has(bill.status);
  const messageType = isSettled
    ? NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED
    : NOTIFICATION_MESSAGE_TYPE.RENT_REMINDER;

  const alreadyNotified = await hasAlreadyNotified(
    bill.tenantId,
    bill._id,
    messageType,
  );
  if (alreadyNotified) return;

  const contact = await resolveTenantContact(bill.tenantId);
  if (!contact) return; // tenant/user vanished — nothing sane to do

  let paymentUrl;
  if (!isSettled) {
    const rawToken = await issuePaymentLink(bill._id);
    paymentUrl = buildPaymentUrl(rawToken);
  }

  const result = await sendBillMessageWithRetry(contact.phone, messageType, {
    tenantName: contact.name,
    bill: {
      type: bill.type,
      amount: bill.amount,
      amountPaid: bill.amountPaid,
      period: bill.period,
      dueDate: bill.dueDate,
    },
    paymentUrl,
  });

  await recordNotificationResult({
    tenantId: bill.tenantId,
    billId: bill._id,
    messageType,
    result,
  });
}

async function sendMonthlyRentReminders() {
  const period = nairobiPeriodString();

  const cursor = Bill.find({ type: BILL_TYPE.RENT, period }).cursor();

  await processCursorWithConcurrency(
    cursor,
    NOTIFICATION_SEND_CONCURRENCY,
    processRentBillReminder,
  );

  logger.info({ period }, "Monthly rent reminder dispatch complete.");

  return { period };
}

function scheduleMonthlyRentReminders() {
  cron.schedule(
    "5 0 6 * *",
    () => {
      sendMonthlyRentReminders().catch((err) => {
        logger.error(
          { errorMessage: err.message },
          "Monthly rent reminder job crashed.",
        );
      });
    },
    { timezone: "Africa/Nairobi" },
  );
}

module.exports = {
  sendMonthlyRentReminders,
  scheduleMonthlyRentReminders,
  // exported for direct unit testing:
  processCursorWithConcurrency,
};
