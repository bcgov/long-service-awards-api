/*!
 * Users controller
 * File: users.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const User = require("../models/users.model.js");

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
    const {id=''} = req.params || {};
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
    const {id=''} = req.params || {};
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
 * Create new user
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.create = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(200).json({
      message: {severity: 'success', summary: 'New User', detail: `Added new admin user.`},
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
    const user = await User.findByID(id);
    await user.save(req.body);
    res.status(200).json({
      message: {severity: 'success', summary: 'New User', detail: `Added new admin user.`},
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
    const {id=''} = req.params || {};

    // check that user exists
    const user = await User.find(id);
    if (!user) return next(Error('noRecord'));
    // delete user
    await User.remove(id);
    res.status(200).json({
      message: {severity: 'success', summary: 'Remove User', detail: 'User record has been deleted.'},
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

exports.roles = async (req, res, next) => {
  try {
    res.status(200).json(res.locals.user);
  } catch (err) {
    return next(err);
  }
};


