/*!
 * Email router
 * File: email.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const emailController = require('../controllers/recipients.admin.controller');
const { authorizeAdmin } = require('../services/auth.services')

/**
 * Emailer endpoints
 */

router.post('/remind/:id', authorizeAdmin, emailController.get);
router.post('/rsvp/confirm/', authorizeAdmin, emailController.get);

module.exports = router;
