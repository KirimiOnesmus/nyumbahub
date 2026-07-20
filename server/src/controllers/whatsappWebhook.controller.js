'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../utils/logger');
const NotificationLog = require('../models/NotificationLog');
const { NOTIFICATION_STATUS } = require('../config/constants');


const STATUS_RANK = {
  [NOTIFICATION_STATUS.SENT]: 1,
  [NOTIFICATION_STATUS.DELIVERED]: 2,
  [NOTIFICATION_STATUS.READ]: 3,
};


function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).type('text/plain').send(challenge);
    return;
  }

  logger.warn('WhatsApp webhook verification attempt failed — mode/token mismatch');
  res.sendStatus(403);
}


function isValidSignature(req) {
  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader || !req.rawBody) return false;

  const expected = crypto
    .createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');
  const provided = signatureHeader.replace('sha256=', '');

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

async function applyStatusUpdate(statusEvent) {
  const { id: waMessageId, status, timestamp } = statusEvent;
  if (!waMessageId || !status) return;

  const log = await NotificationLog.findOne({ waMessageId });
  if (!log) {
    logger.info({ waMessageId, status }, 'WhatsApp status update for unknown waMessageId — ignored');
    return;
  }

  const eventDate = timestamp ? new Date(Number(timestamp) * 1000) : new Date();

  if (status === 'delivered' || status === 'read') {
    const newRank = STATUS_RANK[status];
    const currentRank = STATUS_RANK[log.status] || 0;
    if (newRank > currentRank) {
      log.status = status;
    }
    if (status === 'delivered' && !log.deliveredAt) log.deliveredAt = eventDate;
    if (status === 'read') {
      if (!log.deliveredAt) log.deliveredAt = eventDate; // read implies delivered
      log.readAt = eventDate;
    }
    await log.save();
  } else if (status === 'failed') {
    log.status = NOTIFICATION_STATUS.FAILED;
    await log.save();
  }

}

async function handleStatusUpdate(req, res) {
  if (!isValidSignature(req)) {
    logger.warn('WhatsApp webhook signature verification failed — request rejected');
    return res.sendStatus(401);
  }

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const statuses = change.value?.statuses || [];
        for (const statusEvent of statuses) {
       
          await applyStatusUpdate(statusEvent);
        }

      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Unexpected error processing WhatsApp status webhook');
  }

  res.sendStatus(200);
}

module.exports = { verifyWebhook, handleStatusUpdate };