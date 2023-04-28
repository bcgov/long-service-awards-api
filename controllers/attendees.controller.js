/*!
 * Attendees controller
 * File: attendees.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const attendeesModel = require("../models/attendees.model.js");

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
    const results = await attendeesModel.findAll();
    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
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
    const { id } = req.params || {};
    const results = await attendeesModel.findById(id);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

/**
 * Retrieve attendee record by ceremony ID.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.getByCeremony = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const results = await attendeesModel.findByCeremony(id);
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
    const data = req.body || {};
    const results = await attendeesModel.create(data);
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
    const results = await attendeesModel.update(data);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

/**
 * Get RSVP info for attendee.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.getRSVP = async (req, res, next) => {
  try {
    const data = req.body;
    const results = await attendeesModel.update(data);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

/**
 * Set RSVP info for attendee.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.setRSVP = async (req, res, next) => {
  try {
    const data = req.body;
    const results = await attendeesModel.update(data);
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
    const results = await attendeesModel.remove(id);
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
    const results = await attendeesModel.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};
