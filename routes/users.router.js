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

router.get('/', authorizeAdmin, usersController.getAll);
router.get('/permissions', authorizeSuperAdmin, usersController.roles);
router.get('/permissions/:role', authorizeSuperAdmin, usersController.roles);
router.post('/permissions/update', authorizeSuperAdmin, usersController.roles);
router.post('/roles/:id', authorizeAdmin, usersController.roles);
router.post('/create', authorizeAdmin, usersController.create);
router.post('/update/:id', authorizeAdmin, usersController.update);
router.get('/delete/:id', authorizeSuperAdmin, usersController.remove);
router.get('/:id', authorizeAdmin, usersController.get);

module.exports = router;
