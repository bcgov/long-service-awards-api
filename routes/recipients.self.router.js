/*!
 * Recipients router (Self-registration)
 * File: recipients.self.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.self.controller');
const transactions = require('../services/log.services');

/**
 * Recipient self-registration endpoints
 */

router.get('/view', controller.get);
router.post('/register', controller.register, transactions.log);
router.post('/save', controller.save, transactions.log);

module.exports = router;
