'use strict';

const tenantService = require('../services/tenant.service');

async function getInviteInfo(req, res, next) {
  try {
    const info = await tenantService.getInviteInfo(req.params.token);
    res.status(200).json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
}

async function onboardViaInvite(req, res, next) {
  try {
    const result = await tenantService.onboardViaInvite({ token: req.params.token, ...req.body });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createInviteLink(req, res, next) {
  try {
    const result = await tenantService.createInviteLink(req, req.params.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createTenantDirect(req, res, next) {
  try {
    const result = await tenantService.createTenantDirect(req, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listTenants(req, res, next) {
  try {
    const result = await tenantService.listTenants(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getTenant(req, res, next) {
  try {
    const tenant = await tenantService.getTenant(req, req.params.id);
    res.status(200).json({ success: true, data: { tenant } });
  } catch (err) {
    next(err);
  }
}

async function moveOutTenant(req, res, next) {
  try {
    await tenantService.moveOutTenant(req, req.params.id);
    res.status(200).json({ success: true, data: { message: 'Tenant moved out, unit marked vacant' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInviteInfo,
  onboardViaInvite,
  createInviteLink,
  createTenantDirect,
  listTenants,
  getTenant,
  moveOutTenant,
};