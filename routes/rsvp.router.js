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

// router.get('/list', authorizeAdmin, controller.getAll);
// router.get('/list/:id', authorizeAdmin, controller.getByCeremony);
router.post("/send", authorizeAdmin, controller.send);
router.get("/:id/:token", controller.get);
router.post("/:id/:token", controller.update);
router.post("/create/:id/:token", controller.createAccommodation);
router.get("/get/accommodations", controller.getAccommodations);
// router.get('/delete/:id', authorizeAdmin, controller.remove);

module.exports = router;
