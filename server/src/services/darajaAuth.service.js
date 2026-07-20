'use strict';

const axios = require('axios');
const env = require('../config/env');

const BASE_URL =
  env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString(
    'base64'
  );

  const response = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    timeout: 10_000,
  });

  cachedToken = response.data.access_token;
  cachedTokenExpiresAt = Date.now() + (Number(response.data.expires_in) - 60) * 1000; 
  return cachedToken;
}

module.exports = { getAccessToken, BASE_URL };