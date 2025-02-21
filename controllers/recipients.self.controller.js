/*!
 * Recipients controller (Self-registration)
 * File: recipients.self.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const { sendRegistrationConfirmation } = require("../services/mail.services");
const { confirm } = require("../services/validation.services");

/**
 * Retrieve record for current recipient.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { guid = null } = res.locals.user || {};

    // for delegated users / self-registrations
    const recipient = await Recipient.findByGUID(guid);
    if (!recipient) return next(Error("noRecord"));
    res.status(200).json({
      message: {
        severity: "success",
        summary: "Recipient Record(s) Found",
        detail: "Recipient records found.",
      },
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};
/**
 * SelfRegister current recipient.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.register = async (req, res, next) => {
  try {
    let { guid = null, idir = null } = res.locals.user || {};

    // LSA-506 Instead of creating a new recipient, first check if the GUID already exists

    let recipient = await Recipient.findByGUID(guid);

    if ( !recipient ) {
      // register recipient (creates stub record)
      await Recipient.register({
        idir: idir,
        guid: guid,
        status: "self",
      });
      
      recipient = await Recipient.findByGUID(guid);
    }
    else {
      console.log("Register, found existing recipient for " +guid);
    }
    
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
 * Save current recipient data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.save = async (req, res, next) => {
  try {
    let { guid = null } = res.locals.user || {};
    let user = res.locals.user || null

    // check that recipient exists
    const recipient = await Recipient.findByGUID(guid);

    // handle exceptions
    if (!recipient) return next(Error("noRecord"));
    if (recipient.confirmed) return next(Error("alreadySubmitted"));

    // check confirmation status of registration
    const { service } = req.body || {};
    const { confirmed } = service || {};

    if (
      req.body.organization &&
      req.body.organization.bulk &&
      req.body.supervisor &&
      req.body.supervisor.office_address
    ) {
      console.log(req.body.supervisor);
      delete req.body.supervisor.office_address;
      console.log(req.body.supervisor);
    }
    // Handle registration submissions
    // - check confirmation status of registration
    // - confirm submission data is complete
    if (confirmed) {
      // check that submission has required fields
      if (!confirm(recipient.schema, req.body))
        return next(Error("registrationIncomplete"));
      // update record
      await recipient.save(req.body);
      // send confirmation email (if confirmed)
      await sendRegistrationConfirmation(recipient.data, user);
    } else {
      // save draft registration
      await recipient.save(req.body);
    }

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Recipient Saved Successfully!",
        detail: "Recipient record saved.",
      },
      result: recipient.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete current recipient data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.remove = async (req, res, next) => {
  try {
    let { guid = null } = res.locals.user || {};

    // check that recipient exists
    const recipient = await Recipient.findByGUID(guid);
    if (!recipient) return next(Error("noRecord"));

    // delete record
    await recipient.delete();

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Recipient Deleted Successfully!",
        detail: "Recipient record deleted.",
      },
      result: null,
    });
  } catch (err) {
    return next(err);
  }
};
