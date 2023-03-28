/*!
 * Recipients controller (Administrator)
 * File: recipients.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const uuid = require("uuid");

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
    const recipients = await Recipient.findAll(req.query, res.locals.user);
    // const recipients = await Recipient.findAllTest(req.query, res.locals.user);
    const {total_filtered_records} = await Recipient.count(req.query, res.locals.user);

    // send response
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Recipient Record(s) Found',
        detail: 'Recipient records found.'
      },
      result: {recipients, total_filtered_records}
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

    // check that recipient exists
    const {id} = req.params || {};
    const recipient = await Recipient.findById(id, res.locals.user);

    // handle exception
    if (!recipient) return next(Error('noRecord'));

    res.status(200).json({
      message: {},
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create new record (admin delegated).
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.create = async (req, res, next) => {
  try {

    let { id=null } = res.locals.user || {};

    // register recipient (creates stub record)
    // - create placeholder GUID for delegated registrations
    const guid = uuid.v4();
    await Recipient.register({
      user: id,
      guid: guid,
      status: 'delegated'
    });
    const recipient = await Recipient.findByGUID(guid);

    // handle exception
    if (!recipient) return next(Error('createError'));

    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Add Recipient',
        detail: 'New recipient record created.'
      },
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Save recipient data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.save = async (req, res, next) => {
  try {

    // check that recipient exists
    const {id} = req.params || {};
    const recipient = await Recipient.findById(id, res.locals.user);

    // handle exception
    if (!recipient) return next(Error('noRecord'));

    // update record
    await recipient.save(req.body);

    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Recipient Saved Successfully!',
        detail: 'Recipient record saved.'
      },
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get recipient records stats.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.stats = async (req, res, next) => {
  try {
    res.status(200).json({
      message: {},
      result: await Recipient.stats()
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Assign recipient status record.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.assign = async (req, res, next) => {
  try {
    const results = null;
    res.status(200).json(results);
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
    const results = await Recipient.remove(id);
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
    const results = await Recipient.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};