/*!
 * Recipients router (Administrators)
 * File: recipients.admin.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.admin.controller');
const transactions = require('../services/log.services');
const { authorizeAdmin } = require('../services/auth.services')

/**
 * Recipient admin endpoints
 */

router.get('/list', authorizeAdmin, controller.getAll, transactions.log);
router.post('/create', authorizeAdmin, controller.create, transactions.log);
router.get('/view/:id', authorizeAdmin, controller.get, transactions.log);
router.get('/employee_number/{employee_number}', authorizeAdmin, controller.get);
router.post('/update/:id', authorizeAdmin, controller.update, transactions.log);
router.get('/delete/:id', authorizeAdmin, controller.remove, transactions.log);
router.post('/assign/:id', authorizeAdmin, controller.assign, transactions.log);

module.exports = router;
