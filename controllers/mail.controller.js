/*!
 * Email controller
 * File: email.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const {
  sendRegistrationConfirmation
} = require("../services/mail.services");
const {confirm} = require("../services/validation.services");

/**
 * Mail templates
 * */

const _mailHandlers = {
  'reg-confirm': async (data) => {
    // check confirmation status of registration
    const {service} = data || {};
    const {confirmed} = service || {};
    // Handle registration submissions
    // - check confirmation status of registration
    // - confirm submission data is complete
    if (confirmed) {
      // check that submission has required fields
      if (!confirm(Recipient.schema, data)) return [true, null];
      // send confirmation email (if confirmed)
      return await sendRegistrationConfirmation(data);
    }
    return null;
  },
}

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
    const { id=null } = req.params || {};

    // check that mail handler (w/ template) exists
    const handler = _mailHandlers.hasOwnProperty(id) ? _mailHandlers[id] : null;

    // mail handler is not defined
    if (!handler) return next(Error('invalidInput'));

    // send email
    // - define mail response callback
    const [error, result] = await handler(req.body);

    // handle exceptions
    if (error) return next(Error('failedMailSend'));

    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Mail Sent Successfully!',
        detail: 'Email message was sent.'
      },
      result: result,
    });

  } catch (err) {
    return next(err);
  }
};
