'use strict';

const announcementService = require('../services/announcement.service');

async function createAnnouncement(req, res, next) {
  try {
    const announcement = await announcementService.createAndSendAnnouncement(
      req,
      req.params.buildingId,
      req.body.message
    );
    res.status(201).json({ success: true, data: { announcement } });
  } catch (err) {
    next(err);
  }
}

async function sendDirectAnnouncement(req, res, next) {
  try {
    const announcement = await announcementService.sendDirectAnnouncement(
      req,
      req.params.buildingId,
      req.params.tenantId,
      req.body.message
    );
    res.status(201).json({ success: true, data: { announcement } });
  } catch (err) {
    next(err);
  }
}

async function listAnnouncements(req, res, next) {
  try {
    const result = await announcementService.listAnnouncements(req, req.params.buildingId, req.query);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createAnnouncement, sendDirectAnnouncement, listAnnouncements };