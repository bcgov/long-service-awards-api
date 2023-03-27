/*!
 * Awards controller
 * File: awards.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const Award = require("../models/awards.model.js");

/**
 * Retrieve all records.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const results = await Award.findAll(req.query);
    res.status(200).json({
      message: null,
      result: results,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Retrieve record by ID.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.get = async (req, res, next) => {
  try {

    // retrieve item by ID
    const {id} = req.params || {};
    const item = await Award.findById(id);

    // handle exception
    if (!item) return next(Error('noRecord'));

    // send response
    res.status(200).json({
      message: {},
      result: item,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Filter records by field value.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.filter = async (req, res, next) => {
  try {
    const {field, value} = req.params || {};
    // note: defaults to return only active awards
    const results = await Award.findByField(field, value || null);
    res.status(200).json({
      message: null,
      result: results,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create new record.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.create = async (req, res, next) => {
  try {

    // create new record and save
    const award = await Award.create(req.body);

    // handle exception
    if (!award) return next(Error('noRecord'));

    // send response
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Award Created Successfully!',
        detail: 'New award record created.'
      },
      result: award.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update record.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.update = async (req, res, next) => {
  try {

    // check that recipient exists
    const {id} = req.params || {};
    const award = await Award.findById(id);

    // handle exception
    if (!award) return next(Error('noRecord'));

    // update record
    await award.save(req.body);

    // send response
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Award Updated Successfully!',
        detail: 'Award record updated.'
      },
      result: award.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove record.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const results = await Award.remove(id);

    // send response
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Award Deleted Successfully!',
        detail: 'Award record was removed.'
      },
      result: results,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove all records.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.removeAll = async (req, res, next) => {
  try {
    const results = await Award.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};