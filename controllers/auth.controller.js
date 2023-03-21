/*!
 * Authentication controller
 * File: auth.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

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
          authenticated: true
        }
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
          authenticated: false
        }
      });
    }
    else {
      return next(new Error('noAuth'));
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
            severity: 'success',
            summary: 'Welcome',
            detail: 'You are now signed in.'
          },
          result: req.user,
        });
      }
      else {
        next(new Error('noAuth'));
      }
    });
}

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
    req.logout(function(err) {
      if (err) { return next(err); }
      res.status(200).json({
        message: {
          severity: 'success',
          summary: 'Goodbye!',
          detail: 'You are now signed out.'
        },
        result: {},
      });
    });
  } catch (err) {
    return next(err);
  }
};

