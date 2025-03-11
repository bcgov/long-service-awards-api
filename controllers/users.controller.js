/*!
 * Users controller
 * File: users.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const User = require("../models/users.model.js");
const UserRole = require("../models/user-roles.model");

const Recipient = require("../models/recipients.model.js");
const Transaction = require("../models/transactions.model.js");

/**
 * Find user by ID
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { id = "" } = req.params || {};
    const user = await User.find(id);
    res.status(200).json({
      message: {},
      result: user.data,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Find user by GUID
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getByGUID = async (req, res, next) => {
  try {
    const { id = "" } = req.params || {};
    const user = await User.findByGUID(id);
    res.status(200).json({
      message: {},
      result: user.data,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Retrieve all users.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.status(200).json({
      message: {},
      result: users,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

/**
 * Register new user
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.register = async (req, res, next) => {
  try {
    const { guid = null, idir = null } = res.locals.user || {};

    const {
      first_name = "",
      last_name = "",
      email = "",
      password = "",
    } = req.body || {};

    // check if user is already registered
    if (await User.findByGUID(guid)) return next(Error("userExists"));

    // register user
    await User.register({
      first_name,
      last_name,
      email,
      guid,
      idir,
      password,
      role: "inactive",
    });

    // confirm user exists
    const user = await User.findByGUID(guid);
    if (!user && user.hasOwnProperty(id)) return next(Error("noRecord"));

    res.status(200).json({
      message: {
        severity: "success",
        summary: "New User",
        detail: `Added new admin user.`,
      },
      result: user.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update user data.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.update = async (req, res, next) => {
  try {
    const { id = "" } = req.params || {};
    const user = await User.find(id);

    // handle exception
    if (!user) return next(Error("noRecord"));

    // update record
    await user.save(req.body);

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Updated User Data",
        detail: `Updated admin user.`,
      },
      result: user.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete user.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.remove = async (req, res, next) => {
  try {
    const { id = "" } = req.params || {};

    // check that user exists
    const user = await User.find(id);
    if (!user) return next(Error("noRecord"));

    // check that user is not deleting themselves
    if (res.locals.user.id === id) return next(Error("selfDelete"));

    // LSA-540 Remove Transactions tied to this user before removing User from database

    await Transaction.removeForUser(id);

    // delete user
    await User.remove(id);
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Remove User",
        detail: "User record has been deleted.",
      },
      result: user,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get list of user roles.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.getRoles = async (req, res, next) => {
  try {
    res.status(200).json({
      message: {},
      result: await UserRole.findAll(),
    });
  } catch (err) {
    return next(err);
  }
};
