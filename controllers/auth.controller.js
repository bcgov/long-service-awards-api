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
    console.log(res.locals.user)
    if (req.isAuthenticated()) {
      res.status(200).json({
        message: null,
        result: {
          id: res.locals.user.id,
          guid: res.locals.user.guid,
          idir: res.locals.user.idir,
          email: res.locals.user.email,
          first_name: res.locals.user.first_name,
          last_name: res.locals.user.last_name,
          roles: res.locals.user.roles
        }
      });
    }
    else if (res.locals.user) {
      res.status(200).json({
        message: null,
        result: {
          id: res.locals.user.id,
          guid: res.locals.user.guid,
          idir: res.locals.user.idir,
          roles: res.locals.user.roles
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
  if (req.isAuthenticated()) {
    res.status(200).json({
      message: {severity: 'success', summary: 'Login', detail: 'User has signed in.'},
      result: req.user,
    });
  }
  else {
    next(new Error('noAuth'));
  }
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
        message: {severity: 'success', summary: 'Logout', detail: 'User has signed out.'},
        data: {},
      });
    });
  } catch (err) {
    return next(err);
  }
};

