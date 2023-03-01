/*!
 * Attendees router
 * File: attendees.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const { authorizeAdmin } = require("../services/auth.services");
const controller = require("../controllers/attendees.controller");

/**
 * Router endpoints
 */

router.get('/list', authorizeAdmin, controller.getAll);
router.get('/list/:id', authorizeAdmin, controller.getByCeremony);
router.post('/create', authorizeAdmin, controller.create);
router.get('/view/:id', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.update);
router.get('/delete/:id', authorizeAdmin, controller.remove);
router.get('/rsvp/:id/:token', controller.getRSVP);
router.post('/rsvp/:id/:token', controller.setRSVP);

module.exports = router;
