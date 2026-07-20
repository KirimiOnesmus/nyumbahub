'use strict';

const reportService = require('../services/report.service');

async function getPortfolioReport(req, res, next) {
  try {
    const result = await reportService.getPortfolioReport(req, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getBuildingReport(req, res, next) {
  try {
    const result = await reportService.getBuildingReport(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOverdueTenants(req, res, next) {
  try {
    const result = await reportService.getOverdueTenants(req, req.params.buildingId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getRevenueTrend(req, res, next) {
  try {
    const result = await reportService.getRevenueTrend(req, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortfolioReport, getBuildingReport, getOverdueTenants, getRevenueTrend };