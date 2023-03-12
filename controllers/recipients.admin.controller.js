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

    // send response
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Recipient Record(s) Found',
        detail: 'Recipient records found.'
      },
      result: recipients,
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
    const {id} = req.params || {};
    const results = await Recipient.findById(id);
    res.status(200).json(results);
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
    const {guid=null} = res.locals.user || {};
    console.log('User:', guid);

    // generate a UUID
    const guidIndex = uuid.v4();

    const result = await Recipient.create({user: guid, guid: guidIndex});
    res.status(200).json(result);
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
    const results = await Recipient.update(data);
    res.status(200).json(results);
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
    const data = req.body;
    const results = await Recipient.update(data);
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