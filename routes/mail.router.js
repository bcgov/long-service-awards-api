/*!
 * Email router
 * File: mail.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const mailController = require('../controllers/mail.controller');
const { authorizeOrgContact} = require('../services/auth.services')

/**
 * Mailer endpoints
 */

router.post('/send/:id', authorizeOrgContact, mailController.send);
// router.post('/remind/:id', authorizeAdmin, emailController.get);
// router.post('/rsvp/confirm/', authorizeAdmin, emailController.get);

module.exports = router;
