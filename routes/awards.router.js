/*!
 * Awards router
 * File: awards.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const { authorizeAdmin } = require("../services/auth.services");
const controller = require("../controllers/awards.controller");

/**
 * Router endpoints
 */

// DEBUG
// router.get('/test', controller.getAll);

router.get('/list', authorizeAdmin, controller.getAll);
router.get('/filter/:field/:value', controller.filter);
router.post('/create', authorizeAdmin, controller.create);
router.get('/view/:id', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.update);
router.get('/delete/:id', authorizeAdmin, controller.remove);

module.exports = router;
