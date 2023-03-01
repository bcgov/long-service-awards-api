/*!
 * Recipients controller (Delegated Registrations)
 * File: recipients.delegated.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const User = require("../models/users.model");


/**
 * Retrieve delegated recipient records by user ID.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const {id=null} = res.locals.user || {};

    // for delegated users / self-registrations
    const results = await Recipient.findByUser(id);
    // no records found
    if (!results) return next(Error('noRecord'));
    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Delegated Recipient Record(s) Found',
        detail: 'Recipient records found.'
      },
      result: results,
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

    // create delegated user if one does not exist
    let { id=null, guid=null, idir=null} = res.locals.user || {};
    if (!id) await User.create({guid: guid, idir: idir, roles: ['delegate']});

    // confirm user exists
    const user = await User.findByGUID(guid);
    if (!user && user.hasOwnProperty(id)) return next(Error('noRecord'));

    // create delegated recipient records
    await Recipient.delegate(req.body, user);

    res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Delegated Recipients Saved Successfully!',
        detail: 'Delegated recipient records saved.'
      },
      result: await Recipient.findByUser(user.id),
    });
  } catch (err) {
    return next(err);
  }
};