'use strict';
const caretakerService = require('../services/caretaker.service');

async function createCaretaker(req, res, next) {
  try {
    const result = await caretakerService.createCaretaker(req, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function resendCaretakerCredentials(req, res, next) {
  try {
    const credentialsDelivery = await caretakerService.resendCaretakerCredentials(req, req.params.id);
    res.status(200).json({ success: true, data: { credentialsDelivery } });
  } catch (err) {
    next(err);
  }
}

async function listCaretakers(req, res, next) {
  try {
    const result = await caretakerService.listCaretakers(req, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getCaretaker(req, res, next) {
  try {
    const caretaker = await caretakerService.getCaretaker(req, req.params.id);
    res.status(200).json({ success: true, data: { caretaker } });
  } catch (err) {
    next(err);
  }
}

async function updateCaretaker(req, res, next) {
  try {
    const caretaker = await caretakerService.updateCaretaker(req, req.params.id, req.body);
    res.status(200).json({ success: true, data: { caretaker } });
  } catch (err) {
    next(err);
  }
}

async function assignBuilding(req, res, next) {
  try {
    await caretakerService.assignCaretakerToBuilding(req, req.params.id, req.body.buildingId);
    res.status(201).json({ success: true, data: { message: 'Caretaker assigned to building' } });
  } catch (err) {
    next(err);
  }
}

async function deactivateCaretaker(req, res, next) {
  try {
    await caretakerService.deactivateCaretaker(req, req.params.id);
    res.status(200).json({ success: true, data: { message: 'Caretaker deactivated' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCaretaker,
  resendCaretakerCredentials,
  listCaretakers,
  getCaretaker,
  updateCaretaker,
  assignBuilding,
  deactivateCaretaker,
};