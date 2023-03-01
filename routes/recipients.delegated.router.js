/*!
 * Recipients router (Delegated Registrations)
 * File: recipients.delegated.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.delegated.controller');
const transactions = require('../services/log.services');

/**
 * Recipient delegated registration endpoints
 */

router.get('/view', controller.get);
router.post('/save/', controller.save, transactions.log);

module.exports = router;
