'use strict';

const axios = require('axios');
const logger = require('../utils/logger');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { getAccessToken, BASE_URL } = require('./darajaAuth.service');

function darajaTimestamp() {
  // YYYYMMDDHHmmss, required by Daraja for the password hash below.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function darajaPassword(timestamp) {
  return Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString('base64');
}

async function initiateStkPush({ phone, amount, accountReference, transactionDesc }) {
  const daraja254 = phone.replace('+', '');

  const wholeAmount = Math.ceil(amount);
  const timestamp = darajaTimestamp();

  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: darajaPassword(timestamp),
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: wholeAmount,
        PartyA: daraja254,
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: daraja254,
        CallBackURL: env.MPESA_CALLBACK_URL,
        AccountReference: String(accountReference).slice(0, 12),
        TransactionDesc: String(transactionDesc).slice(0, 13),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15_000,
      }
    );

    if (response.data.ResponseCode !== '0') {
     
      throw new AppError(
        response.data.ResponseDescription || 'M-Pesa declined the payment request',
        502,
        'STK_PUSH_REJECTED'
      );
    }

    return {
      merchantRequestId: response.data.MerchantRequestID,
      checkoutRequestId: response.data.CheckoutRequestID,
      customerMessage: response.data.CustomerMessage,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;

    logger.error(
      { err: err.message, phoneLast4: phone.slice(-4) },
      'STK Push initiation failed'
    );
    throw new AppError(
      'Unable to start the M-Pesa payment right now. Please try again.',
      502,
      'STK_PUSH_UNAVAILABLE'
    );
  }
}

module.exports = { initiateStkPush };