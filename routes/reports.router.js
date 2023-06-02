/*!
 * Reports router
 * File: reports.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const {
  authorizeOrgContact,
  authorizeAdmin,
} = require("../services/auth.services");
const controller = require("../controllers/reports.controller");

/**
 * Router endpoints
 */

// DEBUG
// router.get('/test', controller.test);

router.get("/lsa", authorizeOrgContact, controller.lsa);
router.get("/service-pins", authorizeAdmin, controller.servicePins);
router.get("/attendees", authorizeOrgContact, controller.attendees);

// router.get('/ceremonies', authorizeAdmin, controller.ceremonies);

module.exports = router;
