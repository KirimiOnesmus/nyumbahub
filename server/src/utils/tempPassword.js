'use strict';
const crypto = require('crypto');
function generateTempPassword() {
  const randomPart = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
  return `Aa1${randomPart}`;
}

module.exports = { generateTempPassword };