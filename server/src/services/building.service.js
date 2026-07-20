'use strict';

const mongoose = require('mongoose');
const Building = require('../models/Building');
const Unit = require('../models/Unit');
const CaretakerAssignment = require('../models/CaretakerAssignment');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { UNIT_TYPE_LABELS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');
const { assertBuildingInScope, scopedIdFilter } = require('../middleware/buildingScope.middleware');


function generateUnitDocs(buildingId, unitTypes) {
  const docs = [];
  for (const ut of unitTypes) {
    const label = UNIT_TYPE_LABELS[ut.type];
    for (let i = 1; i <= ut.quantity; i += 1) {
      docs.push({
        buildingId,
        unitNumber: `${label}-${String(i).padStart(2, '0')}`,
        type: ut.type,
        rentAmount: ut.rentAmount,
      });
    }
  }
  return docs;
}

/** Creates a Building and bulk-creates its Units in one transaction. */

async function createBuilding({ name, address, unitTypes, ownerId }) {
  const session = await mongoose.startSession();
  try {
    let building;
    let createdUnits;

    await session.withTransaction(async () => {
      const createdBuildings = await Building.create([{ name, address, ownerId }], { session });
      building = createdBuildings[0];

      const unitDocs = generateUnitDocs(building._id, unitTypes);
      createdUnits = await Unit.insertMany(unitDocs, { session, ordered: true });
    });

    logger.info(
      { buildingId: building._id.toString(), unitCount: createdUnits.length, ownerId },
      'Building created with bulk units'
    );

    return buildStatsResponse(building, {
      totalUnits: createdUnits.length,
      occupiedUnits: 0,
      revenue: 0, 
      caretakers: 0,
      unitTypes: summarizeUnitTypes(createdUnits),
    });
  } finally {
    await session.endSession();
  }
}

/** Groups created/existing units by type into the shape the frontend expects. */

function summarizeUnitTypes(units) {
  const byType = new Map();
  for (const u of units) {
    const key = u.type;
    if (!byType.has(key)) {
      byType.set(key, { type: key, label: UNIT_TYPE_LABELS[key], quantity: 0, rentAmount: u.rentAmount });
    }
    byType.get(key).quantity += 1;
  }
  return Array.from(byType.values());
}

function buildStatsResponse(building, stats) {
  return {
    id: building._id.toString(),
    name: building.name,
    address: building.address,
    ...stats,
  };
}

/** Computes live stats for one building — never trusts stored/denormalized counts. */
async function computeBuildingStats(buildingId) {
  const [units, caretakerCount] = await Promise.all([
    Unit.find({ buildingId, isArchived: false }).lean(),
    CaretakerAssignment.countDocuments({ buildingId }),
  ]);

  return {
    totalUnits: units.length,
    occupiedUnits: units.filter((u) => u.status === 'occupied').length,
    revenue: 0, 
    caretakers: caretakerCount,
    unitTypes: summarizeUnitTypes(units),
  };
}

async function getBuilding(req, buildingId) {
  const building = await Building.findById(buildingId);
  if (!building || building.isArchived) throw AppError.notFound('Building not found');
  assertBuildingInScope(req, building._id);

  const stats = await computeBuildingStats(building._id);
  return buildStatsResponse(building, stats);
}

async function listBuildings(req, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

 const filter = { isArchived: false };
const idFilter = scopedIdFilter(req.buildingScope);
if (idFilter) filter._id = idFilter;

  const [buildings, total] = await Promise.all([
    Building.find(filter).skip(skip).limit(safeLimit).sort({ createdAt: -1 }),
    Building.countDocuments(filter),
  ]);

  const withStats = await Promise.all(
    buildings.map(async (b) => buildStatsResponse(b, await computeBuildingStats(b._id)))
  );

  return {
    buildings: withStats,
    pagination: { page, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
}

async function updateBuilding(req, buildingId, updates) {
  const building = await Building.findById(buildingId);
  if (!building || building.isArchived) throw AppError.notFound('Building not found');
  assertBuildingInScope(req, building._id);

  Object.assign(building, updates);
  await building.save();

  const stats = await computeBuildingStats(building._id);
  return buildStatsResponse(building, stats);
}

/** Soft delete — preserves financial/audit history hanging off this building. */

async function archiveBuilding(req, buildingId) {
  const building = await Building.findById(buildingId);
  if (!building || building.isArchived) throw AppError.notFound('Building not found');
  assertBuildingInScope(req, building._id);

  building.isArchived = true;
  await building.save();

  logger.info({ buildingId: building._id.toString(), archivedBy: req.user.id }, 'Building archived');
}

module.exports = {
  createBuilding,
  getBuilding,
  listBuildings,
  updateBuilding,
  archiveBuilding,
};