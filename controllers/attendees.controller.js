/*!
 * Attendees controller
 * File: attendees.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const Attendees = require("../models/attendees.model.js");
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
    const results = await Attendees.findAll();
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
    const results = await Attendees.findById(id);
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
    const results = await Attendees.findByCeremony(id);
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
    const attendees = [];

    data.recipients.forEach(async (r) => {
      const id = uuid.v4();
      await Attendees.create({
        id: id,
        recipient: r.id,
        ceremony: data.ceremony,
      });
      const attendee = await Attendees.findById(id);
      console.log(`ATTENDEE : ${attendee}`);
      attendees.push(attendee);
    });

    if (attendees != undefined) {
      res.status(200).json({
        message: {
          severity: "success",
          summary: "Add Attendee(s)",
          detail: "New Attendee(s) record created.",
        },
        result: attendees,
      });
    }
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
    const results = await Attendees.update(data);
    res.status(200).json(results);
  } catch (err) {
    console.log(`ERR : ${err}`);
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
    const results = await Attendees.update(data);
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
    const results = await Attendees.update(data);
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
    const results = await Attendees.remove(id);
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
    const results = await Attendees.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};
