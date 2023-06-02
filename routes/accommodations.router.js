/*!
 * Accommodations router
 * File: accommodations.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const { authorizeAdmin } = require("../services/auth.services");
const controller = require("../controllers/accommodations.controller");

/**
 * Router endpoints
 */

router.get("/list", authorizeAdmin, controller.getAll);
router.get("/list/:id", authorizeAdmin, controller.getByAttendee);
router.post("/create", authorizeAdmin, controller.createSelection);
router.get("/view/:id", authorizeAdmin, controller.get);
router.post("/update/:id", authorizeAdmin, controller.update);
router.get("/delete/:id", authorizeAdmin, controller.remove);

module.exports = router;
