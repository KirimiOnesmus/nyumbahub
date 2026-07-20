'use strict';

const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'rt';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    signed: true,
  };
}

module.exports = { REFRESH_COOKIE_NAME, refreshCookieOptions };