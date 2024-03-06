/*!
 * Authentication controller
 * File: auth.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const User = require("../models/users.model");
const {
  resetToken,
  deleteToken,
  validateToken,
} = require("../services/cache.services");
const { sendResetPassword } = require("../services/mail.services");

/**
 * Get current user state retrieved from IDIR (SAML) authentication
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.info = async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      // admin or org-contact authorization
      res.status(200).json({
        message: null,
        result: {
          id: res.locals.user.id,
          guid: res.locals.user.guid,
          idir: res.locals.user.idir,
          email: res.locals.user.email,
          first_name: res.locals.user.first_name,
          last_name: res.locals.user.last_name,
          role: res.locals.user.role,
          organizations: res.locals.user.organizations,
          authenticated: true,
        },
      });
    }
    // restricted user authorization
    else if (res.locals.user) {
      res.status(200).json({
        message: null,
        result: {
          id: res.locals.user.id,
          guid: res.locals.user.guid,
          idir: res.locals.user.idir,
          role: res.locals.user.role,
          authenticated: false,
        },
      });
    } else {
      if (req.url.match("^/(rsvp)/[^/]+/[^/]+$")) return res.status(200);
      return next(new Error("noAuth"));
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * User sign in
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.login = async (req, res, next) => {
  // Explicitly save the session before returning
  req.session.save(() => {
    if (req.isAuthenticated()) {
      res.status(200).json({
        message: {
          severity: "success",
          summary: "Welcome",
          detail: "You are now signed in.",
        },
        result: req.user,
      });
    } else {
      next(new Error("noAuth"));
    }
  });
};

/**
 * User sign out.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.logout = async (req, res, next) => {
  try {
    // clear SMS session data
    res.cookie("session", null, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
      maxAge: 0,
    });
    res.cookie("SMSESSION", null, {
      httpOnly: true,
      sameSite: "strict",
      signed: true,
      maxAge: 0,
    });

    // Passport session logout
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.status(200).json({
        message: {
          severity: "success",
          summary: "Goodbye!",
          detail: "You are now signed out.",
        },
        result: {},
      });
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Validate user token
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.validateToken = async (req, res, next) => {
  try {
    // destructure reset token
    const { userid, token } = req.params;

    // find user by ID
    const user = await User.findById(userid);

    // check if user is a registered user
    if (!user) return next(new Error("notFound"));

    // check if token is valid
    const isValid = await validateToken(userid, token);

    res.status(200).json({
      message: {},
      result: isValid,
    });
  } catch (e) {
    console.error(e);
    next(new Error("passwordResetFailed"));
  }
};

/**
 * User request for password reset
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.requestResetPassword = async (req, res, next) => {
  // find user by email
  const { email } = req.body || {};
  const user = await User.findByEmail(email.toLowerCase());
  const expiry = 60 * 60;

  // check if user is a registered user
  if (!user) return next(new Error("notFound"));

  // get user ID
  const { id } = user.data;

  // generate new token
  const token = await resetToken(user.id, expiry);

  // send reset link in email to user
  const response = await sendResetPassword({
    email,
    link: `${process.env.LSA_APPS_ADMIN_URL}/reset-password/${id}/${token}`,
  });

  res.status(200).json({
    message: {
      severity: "success",
      summary: "Password Reset Request Sent!",
      detail: "A reset link has been sent to your email account.",
    },
    result: response,
  });
};

/**
 * User password reset
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.resetPassword = async (req, res, next) => {
  try {
    // destructure reset token
    const { userid, token } = req.params;

    // find user by ID
    const user = await User.findById(userid);

    // check if user is a registered user
    if (!user) return next(new Error("notFound"));

    // check if token is valid
    const isValid = await validateToken(userid, token);
    if (!isValid) return next(new Error("passwordResetFailed"));

    // reset password
    const result = await User.resetPassword(req.body);

    // delete token
    await deleteToken(userid);

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Success",
        detail: "Your password has been reset.",
      },
      result: !!result.id,
    });
  } catch (e) {
    console.error(e);
    next(new Error("passwordResetFailed"));
  }
};
