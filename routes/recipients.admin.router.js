/*!
 * Recipients router (Administrators)
 * File: recipients.admin.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.admin.controller');
const { authorizeAdmin } = require('../services/auth.services')

/**
 * Recipient admin endpoints
 */

router.get('/list', authorizeAdmin, controller.getAll);
router.post('/create', authorizeAdmin, controller.create);
router.get('/view/:id', authorizeAdmin, controller.get);
router.get('/employee_number/{employee_number}', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.update);
router.get('/delete/:id', authorizeAdmin, controller.remove);
router.post('/assign/:id', authorizeAdmin, controller.assign);

module.exports = router;
