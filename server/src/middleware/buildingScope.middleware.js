'use strict';

const mongoose = require('mongoose');
const CaretakerAssignment = require('../models/CaretakerAssignment');
const Building = require('../models/Building');
const AppError = require('../utils/AppError');
const { ROLES } = require('../config/constants');

async function attachBuildingScope(req, res, next) {
  try {
    if (req.user.role === ROLES.ADMIN) {
      req.buildingScope = { unrestricted: true };
      return next();
    }

    if (req.user.role === ROLES.OWNER) {
      const buildings = await Building.find({ ownerId: req.user.id, isArchived: false })
        .select('_id')
        .lean();
      req.buildingScope = {
        unrestricted: false,
        buildingIds: buildings.map((b) => b._id),
      };
      return next();
    }

    if (req.user.role === ROLES.CARETAKER) {
      const assignments = await CaretakerAssignment.find({ caretakerId: req.user.id })
        .select('buildingId')
        .lean();
      req.buildingScope = {
        unrestricted: false,
        buildingIds: assignments.map((a) => a.buildingId),
      };
      return next();
    }

    return next(AppError.forbidden());
  } catch (err) {
    next(err);
  }
}

function requireBuildingAccess(paramName = 'buildingId') {
 
  return function checkBuildingAccess(req, res, next) {
    const targetId = req.params[paramName];
    if (!req.buildingScope) return next(AppError.forbidden());
    if (req.buildingScope.unrestricted) return next();

    const allowed = req.buildingScope.buildingIds.some((id) => id.toString() === targetId);
    if (!allowed) {
      return next(AppError.notFound('Building not found'));
    }
    next();
  };
}

function assertBuildingInScope(req, buildingId) {
  if (req.buildingScope.unrestricted) return;
  const allowed = req.buildingScope.buildingIds.some((id) => id.toString() === buildingId.toString());
  if (!allowed) throw AppError.notFound('Resource not found');
}

function scopedIdFilter(buildingScope) {
  if (!buildingScope) throw new AppError('Missing building scope', 500, 'INTERNAL_ERROR');
  if (buildingScope.unrestricted) return null;

  const { buildingIds } = buildingScope;
  if (!Array.isArray(buildingIds)) {
    throw new AppError('Invalid building scope', 500, 'INTERNAL_ERROR');
  }

  return mongoose.trusted({ $in: buildingIds });
}

async function loadScopedBuilding(req, buildingId) {
  const building = await Building.findById(buildingId);
  if (!building || building.isArchived) throw AppError.notFound('Building not found');
  assertBuildingInScope(req, building._id);
  return building;
}

module.exports = {
  attachBuildingScope,
  requireBuildingAccess,
  assertBuildingInScope,
  loadScopedBuilding,
  scopedIdFilter,
};