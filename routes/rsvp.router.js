/*!
 * RSVP router
 * File: rsvp.router.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const router = require("express").Router();
const controller = require("../controllers/rsvp.controller");

/**
 * Public endpoints - bypassed in AuthenticateSMS
 */

// Public endpoints:
router.get("/accommodations/list", controller.getAccommodations);
router.get("/:id/:token", controller.get);
router.post("/:id/:token", controller.update);

module.exports = router;
