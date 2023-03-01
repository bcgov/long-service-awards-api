/*!
 * Recipients controller (Self-registration)
 * File: recipients.self.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");

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
    const {guid=null} = res.locals.user || {};

    // for delegated users / self-registrations
    const recipient = await Recipient.findByGUID(guid);
    if (!recipient) return next(Error('noRecord'));
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Recipient Record(s) Found',
        detail: 'Recipient records found.'
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

    let { guid=null, idir=null } = res.locals.user || {};

    // register recipient (creates stub record)
    const recipient = await Recipient.register({
      idir: idir,
      guid: guid,
      status: 'self'
    });

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
 * Save current recipient data.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.save = async (req, res, next) => {
  try {
    let { guid=null } = res.locals.user || {};

    // check that recipient exists
    const recipient = await Recipient.findByGUID(guid);
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