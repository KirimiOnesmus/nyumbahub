'use strict';

const { Router } = require('express');
const webhookController = require('../controllers/webhook.controller');
const whatsappWebhookController = require('../controllers/whatsappWebhook.controller');

const router = Router();


router.post('/webhooks/mpesa/callback', webhookController.mpesaCallback);

router.get('/webhooks/whatsapp/status', whatsappWebhookController.verifyWebhook);
router.post('/webhooks/whatsapp/status', whatsappWebhookController.handleStatusUpdate);

module.exports = router;