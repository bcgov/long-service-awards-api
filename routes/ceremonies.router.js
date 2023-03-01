/*!
 * Ceremonies router
 * File: ceremonies.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/ceremonies.controller");
const { authorizeAdmin } = require("../services/auth.services");

/**
 * Recipient admin endpoints
 */

router.get('/list', authorizeAdmin, controller.get);
router.post('/create', authorizeAdmin, controller.get);
router.get('/view/:id', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.get);
router.get('/delete/:id', authorizeAdmin, controller.get);
router.post('/assign/:id', authorizeAdmin, controller.get);
router.post('/remind/:id', authorizeAdmin, controller.get);
router.post('/rsvp/confirm/', authorizeAdmin, controller.get);

module.exports = router;
