/*!
 * Recipients router (Delegated Registrations)
 * File: recipients.delegated.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.delegated.controller');

/**
 * Recipient delegated registration endpoints
 */

router.get('/view', controller.get);
router.post('/create/', controller.create);
router.post('/save/', controller.save);

module.exports = router;
