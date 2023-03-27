/*!
 * Users router
 * File: users.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const {authorizeAdmin, authorizeSuperAdmin } = require('../services/auth.services');

/**
 * Users endpoints.
 */

router.post('/register', usersController.register);
router.get('/list', authorizeAdmin, usersController.getAll);
router.get('/view/:id', authorizeAdmin, usersController.get);
router.post('/update/:id', authorizeAdmin, usersController.update);
router.get('/delete/:id', authorizeSuperAdmin, usersController.remove);
router.get('/roles/list', authorizeAdmin, usersController.getRoles);
// router.post('/roles/:id', authorizeAdmin, usersController.roles);
// router.get('/permissions', authorizeSuperAdmin, usersController.roles);
// router.get('/permissions/:role', authorizeSuperAdmin, usersController.roles);
// router.post('/permissions/update', authorizeSuperAdmin, usersController.roles);

module.exports = router;
