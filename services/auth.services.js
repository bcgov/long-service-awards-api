/*!
 * User authentication/authorization services
 * File: auth.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

require("dotenv").config();
const axios = require("axios");
const User = require("../models/users.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const LocalStrategy = require("passport-local").Strategy;
const urlParse = require("url");

const nodeEnv = process.env.NODE_ENV;
const baseURL = process.env.LSA_APPS_BASE_URL;
const superadminGUID = process.env.SUPER_ADMIN_GUID;
const superadminIDIR = process.env.SUPER_ADMIN_IDIR;
const superadminEmail = process.env.SUPER_ADMIN_EMAIL;
const superadminPassword = process.env.SUPER_ADMIN_PASSWORD;

("use strict");

/**
 * Initialize Passport config.
 */

exports.initPassport = (passport) => {
  /**
   * Passport does not impose any restrictions on how user records are stored.
   * Instead, we can provide functions to Passport which implements the necessary
   * serialization and deserialization logic. Below we are serializing the user email,
   * and finding the user by email when deserializing.
   * */

  passport.serializeUser(function (user, done) {
    done(null, user.email);
  });

  passport.deserializeUser(function (email, done) {
    User.findByEmail(email)
      .then((user) => {
        const { id, email, guid, idir, role } = user.data || {};
        done(null, { id, email, guid, idir, role });
      })
      .catch((err) => done(err, done));
  });

  /**
   * Configure the LocalStrategy to fetch the user record from the database and verify
   * the hashed password against the password submitted by the user. If that succeeds,
   * the password is valid and the user is authenticated.
   * */

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      function verify(email, password, done) {
        console.log("Authenticate User:", email);
        User.findByEmail(email)
          .then((user) => {
            // User not found
            if (!user) {
              return done(null, false);
            }

            // Always use hashed passwords and fixed time comparison
            bcrypt.compare(password, user.password, (err, isValid) => {
              if (err) {
                return done(
                  { message: err, code: "invalidCredentials" },
                  false
                );
              }
              if (!isValid) {
                return done(null, false);
              }
              return done(null, {
                ...user.data,
                ...{ authenticated: true },
                ...{ password: null },
              });
            });
          })
          .catch(done);
      }
    )
  );
  return passport;
};

/**
 * Authenticate user based on SiteMinder (IDIR) credentials.
 * - retrieves current session data from SAML authenticator
 * - returns user data to client in session cookies
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authenticateSMS = async (req, res, next) => {
  try {
    // check if Public endpoints, API test, RSVP
    if (
      req.url === "/" ||
      req.url === "/rsvp/accommodations/list" ||
      req.url.match("^/(rsvp)/[^/]+/[^/]+$")
    )
      return next();

    // [dev] skip authentication on test/local environments
    if (nodeEnv === "development" || nodeEnv === "test") {
      // check for impersonate query parameters
      // - use guid/idir parameters to test users other than initialized super-administrator
      const url = urlParse.parse(req.url, true);
      const { guid = "", idir = "" } = url.query || {};
      // impersonated user
      if (guid && idir) {
        const user = await User.findByGUID(guid);
        // if user found, use user data, otherwise registrant (no user record)
        res.locals.user = user ? user.data : { guid: guid, idir: idir };
        console.log("Authenticated Test User:\n", res.locals.user);
      }
      // default super-admin user
      else {
        const user = await User.findByGUID(superadminGUID);
        res.locals.user = (user && user.data) || {
          guid: superadminGUID,
          idir: superadminIDIR,
        };
        // check that test super admin user has been initialized
        if (!superadminGUID || !superadminIDIR || !res.locals.user)
          return next(new Error("noTestInit"));
      }
      return next();
    }

    // [prod] get current user data (if authenticated)
    const { session = null, SMSESSION = "" } = req.cookies || {};
    let date = new Date();
    const expDays = 1;
    date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    const SMSCookie =
      "SMSESSION=" +
      SMSESSION +
      "; " +
      expires +
      "; path=/; HttpOnly; Secure=true;";
    const SessionCookie =
      "session=" +
      session +
      "; " +
      expires +
      "; path=/; HttpOnly; Secure=true;";

    // call SAML API - user data endpoint
    let response = await axios.get(`${baseURL}/user_info`, {
      headers: {
        Cookie: `${SessionCookie} ${SMSCookie}`,
      },
    });

    // LSA-561 Debug to check SSO information being returned
    console.log(`User authenticated via SiteMinder: `, response)

    const { data = {} } = response || {};
    const { SMGOV_GUID = [null], username = [null] } = data || {};

    // test that tokens exist
    if (!data || !SMGOV_GUID[0] || !username[0])
      return next(new Error("noAuth"));

    // store user data in response for downstream middleware
    const user = await User.findByGUID(SMGOV_GUID[0]);

    res.locals.user = user
      ? user.data
      : { guid: SMGOV_GUID[0], idir: username[0] };

    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user access based on GUID.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeUser = async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      next();
    }
    // reject unauthenticated users
    else return next(new Error("noAuth"));
  } catch (err) {
    return next(err);
  }
};

/**
 * Authorize user by role.
 *
 * @param {Object} user
 * @param {Array} authorizedRoles
 * @return {boolean} authorization
 * @src public
 */

const _checkAuthorization = (user, authorizedRoles) => {
  const { role } = user || {};
  return authorizedRoles.includes(role.name);
};

/**
 * Authorize organizational contact user.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeOrgContact = async (req, res, next) => {
  const isAuthorized =
    req.isAuthenticated() &&
    _checkAuthorization(res.locals.user, [
      "administrator",
      "super-administrator",
      "org-contact",
    ]);
  return isAuthorized ? next() : next(new Error("noAuth"));
};

/**
 * Authorize admin user.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeAdmin = async (req, res, next) => {
  const isAuthorized =
    req.isAuthenticated() &&
    _checkAuthorization(res.locals.user, [
      "administrator",
      "super-administrator",
    ]);
  return isAuthorized ? next() : next(new Error("noAuth"));
};

/**
 * Authorize super-admin user.
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.authorizeSuperAdmin = async (req, res, next) => {
  const isAuthorized =
    req.isAuthenticated() &&
    _checkAuthorization(res.locals.user, ["super-administrator"]);
  return isAuthorized ? next() : next(new Error("noAuth"));
};

/**
 * Initialize authentication settings
 * - creates default super-admin user (if none exists)
 */

exports.initAuth = async () => {
  try {
    if (!superadminGUID || !superadminIDIR) {
      console.log(`[${nodeEnv}] Default super-administrator NOT initialized.`);
      return;
    }
    // lookup default super-admin user
    const user = await User.findByGUID(superadminGUID);
    if (!user) {
      // create default super-admin user
      // - note that administrators do not have associated organizations
      await User.register({
        idir: superadminIDIR,
        guid: superadminGUID,
        first_name: "ADMIN",
        last_name: "USER",
        email: superadminEmail,
        password: superadminPassword,
        role: "super-administrator",
      });
      console.log(
        `[${nodeEnv}] Default super-administrator '${superadminIDIR}' created.`
      );
    } else {
      console.log(
        `[${nodeEnv}] Default super-administrator '${superadminIDIR}' initialized.`
      );
    }
  } catch (err) {
    console.error(err);
  }
};
