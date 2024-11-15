/*!
 * Recipients router (Administrators)
 * File: recipients.admin.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const router = require('express').Router();
const controller = require('../controllers/recipients.admin.controller');
const { authorizeOrgContact } = require('../services/auth.services')

/**
 * Recipient admin endpoints
 */

router.get('/list', authorizeOrgContact, controller.getAll);
router.post('/create', authorizeOrgContact, controller.create);
router.get('/view/:id', authorizeOrgContact, controller.get);
router.get('/employee_number/{employee_number}', authorizeOrgContact, controller.get);
router.get('/exists/:employee_number', authorizeOrgContact, controller.exists); // count number of recipients based on employee number and cycle (LSA-478)

router.post('/update/:id', authorizeOrgContact, controller.save);
router.get('/delete/:id', authorizeOrgContact, controller.remove);
router.post('/assign/:id', authorizeOrgContact, controller.assign);
router.get('/stats', authorizeOrgContact, controller.stats);

module.exports = router;
