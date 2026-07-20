'use strict';

const buildingService = require('../services/building.service');

async function createBuilding(req, res, next) {
  try {
    const building = await buildingService.createBuilding({
      ...req.body,
      ownerId: req.user.id,
    });
    res.status(201).json({ success: true, data: { building } });
  } catch (err) {
    next(err);
  }
}

async function getBuilding(req, res, next) {
  try {
    const building = await buildingService.getBuilding(req, req.params.id);
    res.status(200).json({ success: true, data: { building } });
  } catch (err) {
    next(err);
  }
}

async function listBuildings(req, res, next) {
  try {
    const result = await buildingService.listBuildings(req, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function updateBuilding(req, res, next) {
  try {
    const building = await buildingService.updateBuilding(req, req.params.id, req.body);
    res.status(200).json({ success: true, data: { building } });
  } catch (err) {
    next(err);
  }
}

async function archiveBuilding(req, res, next) { 
  try {
    await buildingService.archiveBuilding(req, req.params.id);
    res.status(200).json({ success: true, data: { message: 'Building archived' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBuilding,
  getBuilding,
  listBuildings,
  updateBuilding,
  archiveBuilding,
};