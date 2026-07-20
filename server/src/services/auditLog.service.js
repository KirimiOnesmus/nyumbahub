'use strict';

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

async function recordEvent({ actor, action, target, targetId, description, metadata } = {}) {
  try {
    await AuditLog.create({
      actorId: actor?.id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || null,
      action,
      target: target || null,
      targetId: targetId || null,
      description,
      metadata,
    });
  } catch (err) {
    logger.error({ err: err.message, action }, 'Failed to record audit log entry');
  }
}

async function listActivity({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  const skip = (page - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    AuditLog.countDocuments(),
  ]);

  return {
    entries: logs.map((l) => ({
      id: l._id.toString(),
      actor: l.actorName,
      action: l.action,
      target: l.target,
      description: l.description,
      createdAt: l.createdAt,
    })),
    page,
    limit: safeLimit,
    total,
  };
}

module.exports = { recordEvent, listActivity };
