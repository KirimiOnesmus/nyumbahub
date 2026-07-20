'use strict';
const Unit = require('../models/Unit');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { loadScopedBuilding, assertBuildingInScope } = require('../middleware/buildingScope.middleware');

async function createUnit(req, buildingId, { unitNumber, type, monthlyRent }) {

  await loadScopedBuilding(req, buildingId);

  try {
    const unit = await Unit.create({ buildingId, unitNumber, type, rentAmount: monthlyRent });
    logger.info({ unitId: unit._id.toString(), buildingId, createdBy: req.user.id }, 'Unit created');
    return unit.toJSON ? unit.toJSON() : unit;
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('A unit with this number already exists in this building');
    }
    throw err;
  }
}

async function listUnits(req, buildingId, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {

  await loadScopedBuilding(req, buildingId);

  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;
  const filter = { buildingId, isArchived: false };

  const [units, total] = await Promise.all([
    Unit.find(filter).skip(skip).limit(safeLimit).sort({ unitNumber: 1 }),
    Unit.countDocuments(filter),
  ]);

  return {
    units,
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

async function getUnit(req, unitId) {
  const unit = await Unit.findById(unitId);
  if (!unit || unit.isArchived) throw AppError.notFound('Unit not found');
  assertBuildingInScope(req, unit.buildingId);
  return unit;
}

async function updateUnit(req, unitId, updates) {
  const unit = await Unit.findById(unitId);
  if (!unit || unit.isArchived) throw AppError.notFound('Unit not found');
  assertBuildingInScope(req, unit.buildingId);

  const { monthlyRent, ...rest } = updates;
  const patch = monthlyRent !== undefined ? { ...rest, rentAmount: monthlyRent } : rest;

  try {
    Object.assign(unit, patch);
    await unit.save();
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('A unit with this number already exists in this building');
    }
    throw err;
  }

  logger.info({ unitId: unit._id.toString(), updatedBy: req.user.id }, 'Unit updated');
  return unit;
}

module.exports = { createUnit, listUnits, getUnit, updateUnit };