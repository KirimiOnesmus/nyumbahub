'use strict';

const adminService = require('../services/admin.service');

async function getOverview(req, res, next) {
  try {
    const overview = await adminService.getOverview();
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
}

async function getSystemConfig(req, res, next) {
  try {
    const config = await adminService.getSystemConfig();
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function updateSystemConfig(req, res, next) {
  try {
    const config = await adminService.updateSystemConfig(req.body, req.user);
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function changeUserPhone(req, res, next) {
  try {
    const user = await adminService.changeUserPhone(req.params.id, req.body.phone, req.user);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const result = await adminService.resetUserPassword(req.params.id, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getSystemHealth(req, res, next) {
  try {
    const health = await adminService.getSystemHealth();
    res.status(200).json({ success: true, data: health });
  } catch (err) {
    next(err);
  }
}

async function getActivityLog(req, res, next) {
  try {
    const result = await adminService.getActivityLog(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getSystemConfig,
  updateSystemConfig,
  changeUserPhone,
  resetUserPassword,
  deleteUser,
  getSystemHealth,
  getActivityLog,
};
