/*!
 * User authentication router
 * File: auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const authController = require("../controllers/auth.controller");
const router = express.Router();

/**
 * Main API router
 */

router.get("/", function (req, res) {
  res.json("API is running.");
});

/**
 * Admin user authentication endpoints.
 */

// log out of admin dashboard
router.post("/logout", authController.logout);

// password reset for users
router.post("/request-reset-password", authController.requestResetPassword);
router.post("/reset-password/:userid/:token", authController.resetPassword);
router.get("/validate/:userid/:token", authController.validateToken);

// get authenticated user data
router.get("/auth/user", authController.info);

// ignore favicon requests (browser tests)
router.get("/favicon.ico", (req, res) => res.status(204));

module.exports = router;
