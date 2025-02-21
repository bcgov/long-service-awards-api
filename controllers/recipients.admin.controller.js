/*!
 * Recipients controller (Administrator)
 * File: recipients.admin.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const uuid = require("uuid");
const settings = require("../models/settings.model.js");

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
    const { total_filtered_records } = await Recipient.count(
      req.query,
      res.locals.user
    );

    // send response
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Recipient Record(s) Found",
        detail: "Recipient records found.",
      },
      result: { recipients, total_filtered_records },
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
    const { id } = req.params || {};
    const recipient = await Recipient.findById(id, res.locals.user);

    console.log(recipient.data);

    // handle exception
    if (!recipient) return next(Error("noRecord"));

    res.status(200).json({
      message: {},
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};

exports.exists = async (req, res, next) => {
  try {
    // count number of recipients based on employee number and cycle and returns true if it exists (LSA-478)
    const { employee_number } = req.params || {};

    const cycle =
      (await settings.findById("cycle"))?.value || new Date().getFullYear();

    const count = await Recipient.checkForRecipientInCycle(
      employee_number,
      cycle
    );
    // handle exception
    if (!count) return next(Error("dbError"));

    res.status(200).json({
      message: {},
      result: count.total_filtered_records != "0",
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
    let { id = null } = res.locals.user || {};

    // register recipient (creates stub record)
    // - create placeholder GUID for delegated registrations
    const guid = uuid.v4();
    await Recipient.register({
      user: id,
      guid: guid,
      status: "delegated",
    });
    const recipient = await Recipient.findByGUID(guid);

    // handle exception
    if (!recipient) return next(Error("createError"));

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Add Recipient",
        detail: "New recipient record created.",
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
    const userRole = req.user.role.name;
    const activeEditing = await settings.findOneByField(
      "name",
      "nonadmin-editing-active"
    );
    const activeEditingValue = activeEditing ? activeEditing.value : false;

    if (
      ["administrator", "super-administrator"].includes(userRole) ||
      activeEditingValue === "true"
    ) {
      // check that recipient exists
      const { id } = req.params || {};
      const recipient = await Recipient.findById(id, res.locals.user);

      // handle exception
      if (!recipient) return next(Error("noRecord"));

      // update record
      await recipient.save(req.body);

      res.status(200).json({
        message: {
          severity: "success",
          summary: "Recipient Saved Successfully!",
          detail: "Recipient record saved.",
        },
        result: recipient.data,
      });
    } else {
      res.status(401).json({
        message: {
          severity: "error",
          summary: "Error saving!",
          detail: "Error saving",
        },
        result: undefined,
      });
    }
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
      result: await Recipient.stats(),
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
    const userRole = req.user.role.name;
    /*
      Guessing this line was done in order to test permissions.
      const userRole = "delegate";
    */
    const activeEditing = await settings.findOneByField(
      "name",
      "nonadmin-editing-active"
    );
    const activeEditingValue = activeEditing ? activeEditing.value : false;

    if (
      ["administrator", "super-administrator"].includes(userRole) ||
      activeEditingValue === "true"
    ) {
      const id = req.params.id;
      const results = await Recipient.remove(id);
      res.status(200).json(results);
    } else {
      res.status(401).json({
        message: {
          severity: "error",
          summary: "Error saving!",
          detail: "Error saving",
        },
        result: undefined,
      });
    }
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
