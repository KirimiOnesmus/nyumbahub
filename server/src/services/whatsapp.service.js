'use strict';

const axios = require('axios');
const env = require('../config/env');
const { NOTIFICATION_MESSAGE_TYPE } = require('../config/constants');

const API_VERSION = 'v21.0'; 
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;


const TEMPLATE_REGISTRY = {
  [NOTIFICATION_MESSAGE_TYPE.RENT_REMINDER]: {
    templateName: 'rent_reminder',
    languageCode: 'en',
    paramOrder: ['tenantName', 'amountLabel', 'period', 'dueDateLabel', 'paymentUrl'],
  },
  [NOTIFICATION_MESSAGE_TYPE.PAYMENT_CONFIRMED]: {

    templateName: 'pay_confirmed',
    languageCode: 'en',
    paramOrder: ['tenantName', 'typeLabel', 'amountPaidLabel', 'period'],
  },
  [NOTIFICATION_MESSAGE_TYPE.MANUAL_BILL_CREATED]: {
    templateName: 'manual_bill_created',
    languageCode: 'en',
    paramOrder: ['tenantName', 'typeLabel', 'amountLabel', 'dueDateLabel', 'paymentUrl'],
  },
  [NOTIFICATION_MESSAGE_TYPE.ANNOUNCEMENT]: {
   
    templateName: 'aannouncement', 
    languageCode: 'en', 
    paramOrder: ['messageBody'],
  },
  [NOTIFICATION_MESSAGE_TYPE.PASSWORD_RESET]: {

    templateName: 'aaccount_access_link',
    languageCode: 'en',
    paramOrder: ['resetLink'],
  },
  [NOTIFICATION_MESSAGE_TYPE.INVITE]: {
 
    templateName: 'team_member_added',
    languageCode: 'en',
    paramOrder: ['name', 'roleLabel', 'inviteLink'],
  },
  [NOTIFICATION_MESSAGE_TYPE.WELCOME_CREDENTIALS]: {

    templateName: 'aaccount_ready_notice',
    languageCode: 'en',
    paramOrder: ['name', 'roleLabel', 'tempPassword', 'loginUrl'],
  },
};


async function sendTemplateMessage(phone, messageType, params) {
  const template = TEMPLATE_REGISTRY[messageType];
  if (!template) {
    throw new Error(`No template registered for messageType: ${messageType}`);
  }

  const meta254 = phone.replace('+', ''); 

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
    
    const metaMessage = err.response?.data?.error?.message;
    throw new Error(metaMessage || err.message || 'WhatsApp send failed');
  }
}

module.exports = { sendTemplateMessage, TEMPLATE_REGISTRY };