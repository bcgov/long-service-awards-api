/*!
 * Email controller
 * File: email.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const {
  sendRegistrationConfirmation,
  healthCheck,
  updateQueued,
} = require("../services/mail.services");
const axios = require("axios");
// const {confirm} = require("../services/validation.services");

/**
 * Mail templates
 * */

const _mailHandlers = {
  "reg-confirm": async (data, user) => {
    // check confirmation status of registration
    const { id, service } = data || {};
    const { confirmed } = service || {};
    // get recipient data
    const recipient = await Recipient.findById(id, user);
    // Handle registration submissions
    // - check confirmation status of registration
    // - confirm submission data is complete
    if (confirmed) {
      // check that submission has required fields
      // if (!confirm(Recipient.schema, data)) return [true, null];
      // send confirmation email (if confirmed)
      return await sendRegistrationConfirmation(recipient.data, user);
    }
    return null;
  },
};

exports.health = async (req, res, next) => {
  const result = healthCheck(req, res);
};

exports.updateQueued = async (req, res, next) => {
  const result = updateQueued(req, res, next);
};

/**
 * Send email
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.send = async (req, res, next) => {
  try {
    const { id = null } = req.params || {};

    // check that mail handler (w/ template) exists
    const handler = _mailHandlers.hasOwnProperty(id) ? _mailHandlers[id] : null;

    // mail handler is not defined
    if (!handler) return next(Error("invalidInput"));

    // send email
    // - define mail response callback
    const [error, result] = await handler(req.body, res.locals.user);

    // handle exceptions
    if (error) {
      console.error(error);
      return next(error);
    }

    res.status(200).json({
      message: {
        severity: "success",
        summary: "Mail Sent Successfully!",
        detail: "Email message was sent.",
      },
      result: result,
    });
  } catch (err) {
    return next(err);
  }
};
