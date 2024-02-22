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
 * Retrieve all records filtered for user.
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
    const { id } = req.params || {};
    console.log(id);
    const item = await res.locals.model.findById(id);

    // handle exception
    if (!item) return next(Error("noRecord"));

    // send response
    res.status(200).json({
      message: {},
      result: item.data,
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
    const { field, value } = req.params || {};
    const results = await res.locals.model.findByField(field, value || null);
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
    // create new item
    const item = await res.locals.model.create(req.body);

    // handle exception
    if (!item) return next(Error("dbError"));

    // send response
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Record Created Successfully!",
        detail: "New record was created.",
      },
      result: item.data,
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
    const item = await res.locals.model.update(req.body);
    // handle exception
    if (!item) return next(Error("noRecord"));

    // send response
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Update Successful!",
        detail: "Record was updated.",
      },
      result: item.data,
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
    const result = await res.locals.model.remove(id);

    // send response
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Delete Successful!",
        detail: "Record was deleted.",
      },
      result: result,
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
    const result = await res.locals.model.removeAll();
    // send response
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Delete All Successful!",
        detail: "All records were deleted.",
      },
      result: result,
    });
  } catch (err) {
    return next(err);
  }
};
