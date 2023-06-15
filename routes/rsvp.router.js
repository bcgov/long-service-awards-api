/*!
 * RSVP router
 * File: rsvp.router.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const { authorizeAdmin } = require("../services/auth.services");
const controller = require("../controllers/rsvp.controller");

/**
 * Router endpoints
 */
router.post("/send", authorizeAdmin, controller.send);

// Public endpoints:
router.get('/accommodations/list', controller.getAccommodations);
router.get("/:id/:token", controller.get);
router.post("/:id/:token", controller.update);


module.exports = router;
