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
 * Create delegated user.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

// exports.create = async (req, res, next) => {
//   try {
//
//     let { id=null, guid=null, idir=null} = res.locals.user || {};
//
//     // create delegated user if one does not exist
//     if (!id) await User.register({guid, idir, role: 'delegate'});
//
//     // confirm user exists
//     const user = await User.findByGUID(guid);
//     if (!user && user.hasOwnProperty(id)) return next(Error('noRecord'));
//
//     res.status(200).json({
//       message: {
//         severity: 'success',
//         summary: 'Delegated User Created Successfully!',
//         detail: 'Delegated user created.'
//       },
//       result: await Recipient.findByUser(user.id),
//     });
//   } catch (err) {
//     return next(err);
//   }
// };

/**
 * Save delegated recipient data.
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
    if (!id) await User.register({guid: guid, idir: idir, role: 'delegate'});

    // confirm user exists
    const user = await User.findByGUID(guid);
    if (!user && user.hasOwnProperty(id)) return next(Error('noRecord'));

    // create delegated recipient records
    const result = await Recipient.delegate(req.body, user);

    // check result is valid
    if (!result) return next(Error('invalidInput'));

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