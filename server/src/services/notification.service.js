'use strict';

const logger = require('../utils/logger');
const env = require('../config/env');
const whatsappService = require('./whatsapp.service');
const {
  BILL_TYPE_LABELS,
  NOTIFICATION_STATUS,
  NOTIFICATION_MESSAGE_TYPE,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_BACKOFF_MS,
} = require('../config/constants');

const LAST_ERROR_MAX_LENGTH = 500; 

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeError(err) {
  const message = err && err.message ? String(err.message) : 'Unknown error';
  return message.slice(0, LAST_ERROR_MAX_LENGTH);
}


function buildPreviewText(messageType, params) {
  switch (messageType) {
    case NOTIFICATION_MESSAGE_TYPE.RENT_REMINDER:
      return `Hi ${params.tenantName}, your rent of ${params.amountLabel} for ${params.period} is due by ${params.dueDateLabel}. Pay now: ${params.paymentUrl}`;
    case NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED:
      return `Hi ${params.tenantName}, we've received your ${String(params.typeLabel).toLowerCase()} payment of ${params.amountPaidLabel} for ${params.period}. Thank you!`;
    case NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED:
      return `Hi ${params.tenantName}, a new ${params.typeLabel} bill of ${params.amountLabel} has been posted, due ${params.dueDateLabel}. Pay now: ${params.paymentUrl}`;
    case NOTIFICATION_MESSAGE_TYPE.ANNOUNCEMENT:
      return `Message from your property manager: ${params.messageBody}`;
    case NOTIFICATION_MESSAGE_TYPE.PASSWORD_RESET:
      return `Password reset link: ${params.resetLink}`;
    case NOTIFICATION_MESSAGE_TYPE.INVITE:
      return `Hi ${params.name}, you've been invited as a ${params.roleLabel}. Set up your account: ${params.inviteLink}`;
    case NOTIFICATION_MESSAGE_TYPE.WELCOME_CREDENTIALS:
      // Never log this preview outside NODE_ENV !== 'production' (see sendOnce below).
      return `Hi ${params.name}, your ${params.roleLabel} account is ready. Temp password: ${params.tempPassword}. Log in: ${params.loginUrl}`;
    default:
      return JSON.stringify(params);
  }
}


async function sendOnce(phone, messageType, params) {
  if (env.NODE_ENV !== 'production') {
  
    console.log(`\n[DEV ONLY — WhatsApp ${messageType} to ${phone}]\n${buildPreviewText(messageType, params)}\n`);
    return { waMessageId: `dev-${Date.now()}` };
  }

  return whatsappService.sendTemplateMessage(phone, messageType, params);
}


async function sendTemplateWithRetry(phone, messageType, params) {
  let lastError = null;

  for (let attempt = 1; attempt <= NOTIFICATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const { waMessageId } = await sendOnce(phone, messageType, params);
      return { status: NOTIFICATION_STATUS.SENT, attempts: attempt, lastError: null, waMessageId };
    } catch (err) {
      lastError = sanitizeError(err);
      const isLastAttempt = attempt === NOTIFICATION_MAX_ATTEMPTS;
      if (!isLastAttempt) {
        const backoffMs =
          NOTIFICATION_RETRY_BACKOFF_MS[attempt - 1] ??
          NOTIFICATION_RETRY_BACKOFF_MS[NOTIFICATION_RETRY_BACKOFF_MS.length - 1];
        await delay(backoffMs);
      }
    }
  }

  logger.error(
    { messageType, attempts: NOTIFICATION_MAX_ATTEMPTS },
    'Notification send failed after exhausting retries.'
  );

  return { status: NOTIFICATION_STATUS.FAILED, attempts: NOTIFICATION_MAX_ATTEMPTS, lastError, waMessageId: null };
}


async function sendBillMessageWithRetry(phone, messageType, context) {
  const { tenantName, bill, paymentUrl } = context;
  const typeLabel = BILL_TYPE_LABELS[bill.type] || bill.type;
  const dueDateLabel = bill.dueDate
    ? new Date(bill.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const params = {
    tenantName: tenantName || 'there',
    typeLabel,
    amountLabel: `KES ${Number(bill.amount).toLocaleString('en-KE')}`,
    amountPaidLabel: `KES ${Number(bill.amountPaid).toLocaleString('en-KE')}`,
    period: bill.period,
    dueDateLabel,
    paymentUrl: paymentUrl || '',
  };

  return sendTemplateWithRetry(phone, messageType, params);
}


async function sendAnnouncementWithRetry(phone, messageBody) {
  return sendTemplateWithRetry(phone, NOTIFICATION_MESSAGE_TYPE.ANNOUNCEMENT, { messageBody });
}


/**
 * Sends an account-invite link (owner/caretaker onboarding). Never throws —
 * returns { status, attempts, lastError, waMessageId } so the caller can
 * decide how to react (e.g. still create the invite record, surface a
 * "resend" action) rather than the whole request failing on a WhatsApp
 * outage.
 */
async function sendInviteWithRetry(phone, { name, roleLabel, inviteLink }) {
  return sendTemplateWithRetry(phone, NOTIFICATION_MESSAGE_TYPE.INVITE, {
    name: name || 'there',
    roleLabel,
    inviteLink,
  });
}


/**
 * Sends a freshly generated temporary password out-of-band via WhatsApp.
 * This is the ONLY place a temp password should ever be transmitted —
 * never return it in an HTTP response body or write it to logs.
 */
async function sendWelcomeCredentialsWithRetry(phone, { name, roleLabel, tempPassword, loginUrl }) {
  return sendTemplateWithRetry(phone, NOTIFICATION_MESSAGE_TYPE.WELCOME_CREDENTIALS, {
    name: name || 'there',
    roleLabel,
    tempPassword,
    loginUrl,
  });
}


async function sendPasswordResetToken(phone, token) {
  const resetLink = `${env.APP_BASE_URL}/reset-password?token=${token}`;
  const result = await sendTemplateWithRetry(phone, NOTIFICATION_MESSAGE_TYPE.PASSWORD_RESET, { resetLink });

  if (result.status === NOTIFICATION_STATUS.FAILED) {
    throw new Error(result.lastError || 'Password reset delivery failed');
  }
}

module.exports = {
  sendTemplateWithRetry,
  sendBillMessageWithRetry,
  sendAnnouncementWithRetry,
  sendInviteWithRetry,
  sendWelcomeCredentialsWithRetry,
  sendPasswordResetToken,
  buildPreviewText, // exported for unit testing
};