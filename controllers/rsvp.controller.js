/*!
 * RSVP controller
 * File: rsvp.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */


const uuid = require("uuid");
const {sendRSVP} = require("../services/mail.services");

const {rsvpToken, deleteToken, validateToken} = require('../services/cache.services');
/**
 * Send invite emails for selected recipients
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.send = async (req, res, next) => {
  try {
    // const { id } = req.params || {};
    // const ceremony = await ceremoniesModel.findById(id);
    // res.status(200).json({
    //   message: {},
    //   result: ceremony.data,
    // });
    const data = req.body || {};
    const recipient = data.recipient;
    const email = recipient.contact.office_email;
    const today = new Date();
    today.setDate(today.getDate() - 2);
    if (recipient.retirement_date != null && recipient.retirement_date < today)
    {
        email = recipient.contact.personal_email;
    }
    var token = await rsvpToken(recipient.id,1209600);

    var valid = await validateToken(recipient.id, token)



// get data:

  const response = await sendRSVP({
    email,
    link: `${process.env.LSA_APPS_ADMIN_URL}/reset-password/${recipient.id}/${token}`
  });

    return res;
    
  } catch (err) {
    return next(err);
  }
};

