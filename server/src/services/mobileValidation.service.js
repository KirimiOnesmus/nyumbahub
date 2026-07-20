'use strict';

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');
const env = require('../config/env');
const { ID_TYPE } = require('../config/constants');
const { getAccessToken, BASE_URL } = require('./darajaAuth.service');

const ENDPOINT_PATH = '/v1/KYC-validation/validateID';

const DARAJA_ID_TYPE_CODE = Object.freeze({
  [ID_TYPE.NATIONAL_ID]: '01',
  [ID_TYPE.MILITARY_ID]: '02',
  [ID_TYPE.PASSPORT]: '05',
});

async function validateMobileNumber({ phone, idType, idNumber }) {
  const daraja254 = phone.replace('+', '');
  const darajaIdType = DARAJA_ID_TYPE_CODE[idType];

  if (!darajaIdType) {
 
    logger.error({ idType }, 'Unmapped idType for Mobile Number Validation API');
    throw new Error('MOBILE_VALIDATION_UNAVAILABLE');
  }

  const requestRefID = crypto.randomUUID();

  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${BASE_URL}${ENDPOINT_PATH}`,
      {
        requestRefID,
        shortCode: env.MPESA_SHORTCODE,
        msisdn: daraja254,
        idType: darajaIdType,
        idNumber: String(idNumber),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      }
    );

    // Per Safaricom's spec, `status` is the string "true"/"false", not a JSON boolean.
    return String(response.data?.status).toLowerCase() === 'true';
  } catch (err) {
    const darajaErrorCode = err.response?.data?.errorCode;
    logger.error(
      {
        err: err.message,
        phoneLast4: phone.slice(-4),
        requestRefID,
        darajaStatus: err.response?.status,
        darajaErrorCode,
   
        darajaBody: err.response?.data,
        requestUrl: `${BASE_URL}${ENDPOINT_PATH}`,
      },
      darajaErrorCode === '403.001'
        ? 'Mobile Number Validation API rejected the request: subscription not active for this Daraja app — onboarding will be blocked (fail-closed)'
        : 'Mobile Number Validation API call failed — onboarding will be blocked (fail-closed)'
    );
    throw new Error('MOBILE_VALIDATION_UNAVAILABLE');
  }
}

module.exports = { validateMobileNumber };