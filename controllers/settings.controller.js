/*!
 * Settings controller
 * File: settings.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

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

    // apply query filter to results
    const items = await res.locals.model.findAll(req.query);

    // send response
    res.status(200).json({
      message: {},
      result: items,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Retrieve all records.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.getAllByUser = async (req, res, next) => {
  try {

    // apply query filter to results
    const items = await res.locals.model.findAll(req.query, res.locals.user);

    // send response
    res.status(200).json({
      message: {},
      result: items,
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
    const item = await res.locals.model.findById(id);

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
    const data = req.body || {};
    const results = await res.locals.model.create(data);
    res.status(200).json(results);
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

    const data = req.body;
    const item = await res.locals.model.save(data);

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
    const results = await res.locals.model.remove(id);
    res.status(200).json(results);
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
    const results = await res.locals.model.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};