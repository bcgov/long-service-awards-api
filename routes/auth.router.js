/*!
 * User authentication router
 * File: auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require('express')
const authController = require("../controllers/auth.controller");
const router = express.Router();
const { initPassport} = require("../services/auth.services");
const passport = initPassport();

/**
 * Main API router
 */

router.get('/', function (req, res) {
  res.json('API is running.');
});

/**
 * Admin user authentication endpoints.
 */

// log into admin dashboard
router.post('/login',
    passport.authenticate('local', {}, null),
    authController.login
);
// log out of admin dashboard
router.post('/logout', authController.logout);

// password reset for admin users
router.get('/forgot-password', authController.logout);
router.post('/request-reset-password', authController.logout);
router.post('/reset-password', authController.logout);

// get authenticated user data
router.get('/auth/user', authController.info);

// ignore favicon requests (browser tests)
router.get('/favicon.ico', (req, res) => res.status(204));

module.exports = router;
