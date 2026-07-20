'use strict';

const unitService = require('../services/unit.service');

async function createUnit(req, res, next) {
  try {
    const unit = await unitService.createUnit(req, req.params.buildingId, req.body);
    res.status(201).json({ success: true, data: { unit } });
  } catch (err) {
    next(err); 
  }
}

async function listUnits(req, res, next) {
  try {
    const result = await unitService.listUnits(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getUnit(req, res, next) {
  try {
    const unit = await unitService.getUnit(req, req.params.id);
    res.status(200).json({ success: true, data: { unit } });
  } catch (err) {
    next(err);
  }
}

async function updateUnit(req, res, next) {
  try {
    const unit = await unitService.updateUnit(req, req.params.id, req.body);
    res.status(200).json({ success: true, data: { unit } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUnit, listUnits, getUnit, updateUnit };