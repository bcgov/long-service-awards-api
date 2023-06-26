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
const { authorize } = require("passport");

/**
 * Recipient admin endpoints
 */

router.get('/list', authorizeAdmin, controller.getAll);
router.post('/create', authorizeAdmin, controller.create);
router.get('/view/:id', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.update);
router.get('/delete/:id', authorizeAdmin, controller.remove);
router.post('/assign/:id', authorizeAdmin, controller.get); // not implemented yet
router.post('/remind/:id', authorizeAdmin, controller.get); // not implemented yet
router.post('/rsvp/confirm/', authorizeAdmin, controller.get); // not implemented yet

module.exports = router;
