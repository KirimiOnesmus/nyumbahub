'use strict';

const authService = require('../services/auth.service');
const passwordService = require('../services/password.service');
const { REFRESH_COOKIE_NAME, refreshCookieOptions } = require('../utils/cookies');

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; 

async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login({
      phone,
      password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.status(200).json({ success: true, data: { accessToken, user } });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const incoming = req.signedCookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, refreshToken } = await authService.refresh({
      refreshToken: incoming,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...refreshCookieOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });

    res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
   
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const incoming = req.signedCookies?.[REFRESH_COOKIE_NAME];
    await authService.logout({
      refreshToken: incoming,
      userId: req.user?.id,
      allDevices: Boolean(req.body?.allDevices),
    });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(200).json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
}

async function requestPasswordReset(req, res, next) {
  try {
    await passwordService.requestPasswordReset(req.body.phone);

    res.status(200).json({
      success: true,
      data: { message: 'If that phone number is registered, a reset link has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await passwordService.resetPassword(req.body);
    res.status(200).json({ success: true, data: { message: 'Password reset successful. Please log in.' } });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    await passwordService.changePassword({ userId: req.user.id, ...req.body });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    res
      .status(200)
      .json({ success: true, data: { message: 'Password changed. Please log in again.' } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe({ userId: req.user.id });
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await authService.updateMe({ userId: req.user.id, updates: req.body });
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, me, updateMe, requestPasswordReset, resetPassword, changePassword };