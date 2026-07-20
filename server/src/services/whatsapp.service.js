'use strict';

const axios = require('axios');
const env = require('../config/env');
const { NOTIFICATION_MESSAGE_TYPE } = require('../config/constants');

const API_VERSION = 'v21.0'; // bump here if Meta deprecates this version; not env-configurable, low churn
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

/**
 * TODO (blocked on Meta template approval): templateName and paramOrder
 * must match EXACTLY what Meta approves — template name is whatever you
 * name it at submission, paramOrder must match the {{1}}, {{2}}, ... slots
 * in the approved template body, in order. These are reasonable working
 * names/orders, not yet verified against a real approved template.
 * languageCode uses Meta's locale format (en_US, not just "en").
 */
const TEMPLATE_REGISTRY = {
  [NOTIFICATION_MESSAGE_TYPE.RENT_REMINDER]: {
    templateName: 'rent_reminder', // PLACEHOLDER
    languageCode: 'en_US',
    paramOrder: ['tenantName', 'amountLabel', 'period', 'dueDateLabel', 'paymentUrl'],
  },
  [NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED]: {
    templateName: 'payment_confirmed', // PLACEHOLDER
    languageCode: 'en_US',
    paramOrder: ['tenantName', 'typeLabel', 'amountPaidLabel', 'period'],
  },
  [NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED]: {
    templateName: 'manual_bill_created', // PLACEHOLDER
    languageCode: 'en_US',
    paramOrder: ['tenantName', 'typeLabel', 'amountLabel', 'dueDateLabel', 'paymentUrl'],
  },
  [NOTIFICATION_MESSAGE_TYPE.ANNOUNCEMENT]: {
    // Generic single-parameter template — the only way to send Owner/
    // Caretaker-authored freeform text within WhatsApp's template
    // requirement. Approved body should read roughly:
    // "Message from your property manager: {{1}}"
    templateName: 'announcement', 
    languageCode: 'en_US',
    paramOrder: ['messageBody'],
  },
  [NOTIFICATION_MESSAGE_TYPE.PASSWORD_RESET]: {
    templateName: 'password_reset', 
    languageCode: 'en_US',
    paramOrder: ['resetLink'],
  },
  [NOTIFICATION_MESSAGE_TYPE.INVITE]: {
    // Approved body should read roughly:
    // "Hi {{1}}, you've been invited as a {{2}} on [App]. Set up your
    // account here: {{3}}. This link expires soon — do not share it."
    templateName: 'account_invite', // PLACEHOLDER
    languageCode: 'en_US',
    paramOrder: ['name', 'roleLabel', 'inviteLink'],
  },
  [NOTIFICATION_MESSAGE_TYPE.WELCOME_CREDENTIALS]: {
    // Approved body should read roughly:
    // "Hi {{1}}, your {{2}} account has been created. Temporary password:
    // {{3}}. Log in and change it here: {{4}}. Do not share this password."
    templateName: 'welcome_credentials', // PLACEHOLDER
    languageCode: 'en_US',
    paramOrder: ['name', 'roleLabel', 'tempPassword', 'loginUrl'],
  },
};

/**
 * Sends an approved WhatsApp template message. `params` is a plain object
 * keyed by the names in TEMPLATE_REGISTRY's paramOrder for this messageType
 * — this function looks up the right order and builds Meta's positional
 * `components[].parameters[]` array from it, so call sites pass named
 * values (readable) rather than a fragile bare positional array.
 *
 * Returns { waMessageId } on success. Throws with a message extracted from
 * Meta's structured error response on failure — never a raw axios error.
 */
async function sendTemplateMessage(phone, messageType, params) {
  const template = TEMPLATE_REGISTRY[messageType];
  if (!template) {
    throw new Error(`No template registered for messageType: ${messageType}`);
  }

  const meta254 = phone.replace('+', ''); // Meta expects no leading '+'

  const body = {
    messaging_product: 'whatsapp',
    to: meta254,
    type: 'template',
    template: {
      name: template.templateName,
      language: { code: template.languageCode },
      components: [
        {
          type: 'body',
          parameters: template.paramOrder.map((key) => ({
            type: 'text',
            text: String(params[key] ?? ''),
          })),
        },
      ],
    },
  };

  try {
    const response = await axios.post(BASE_URL, body, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });

    const waMessageId = response.data?.messages?.[0]?.id;
    if (!waMessageId) {
      throw new Error('WhatsApp API returned success but no message id');
    }
    return { waMessageId };
  } catch (err) {
    // Meta's structured error shape: { error: { message, type, code, ... } }
    const metaMessage = err.response?.data?.error?.message;
    throw new Error(metaMessage || err.message || 'WhatsApp send failed');
  }
}

module.exports = { sendTemplateMessage, TEMPLATE_REGISTRY };