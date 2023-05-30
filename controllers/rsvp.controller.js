/*!
 * RSVP controller
 * File: rsvp.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */


const uuid = require("uuid");
const {sendRSVP} = require("../services/mail.services");
const Attendees = require("../models/attendees.model.js");
const Accommodations = require("../models/accommodations.model.js");
const AccommodationSelections = require("../models/accommodation-selection.model.js");


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

    // Create 48 hour grace period 
    today.setDate(today.getDate() - 2);
    if (recipient.retirement_date != null && recipient.retirement_date < today)
    {
        email = recipient.contact.personal_email;
    }
    const token = await rsvpToken(data.id,1209600);

    const valid = await validateToken(data.id, token)



// get data:

  const response = await sendRSVP({
    email,
    link: `${process.env.LSA_APPS_ADMIN_URL}/rsvp/${data.id}/${token}`,
    attendee: data
  });

    return res;
    
  } catch (err) {
    return next(err);
  }
};

exports.get = async (req, res, next) => {
    try {

    const id = req.params.id;
    const token = req.params.token;

    const valid = await validateToken(id, token);

    if (!valid) throw (err = "Not Valid");
    
    const results = await Attendees.findById(id);
    if (!results) throw (err = "Not existing");

    res.status(200).json(results.data);


    } catch (err) {

    }
};

exports.update = async (req, res, next) => {
    try {
        const data = req.body;
        const id = req.params.id;
        const token = req.params.token;
        const valid = await validateToken(id, token);

        if (!valid) throw (err = "Not Valid");
        
        const attendee = await Attendees.findById(data.id);
    
        // handle exception
        if (!attendee) return next(Error("noRecord"));
        await attendee.save(data);
    
        res.status(200).json({
          message: {},
          result: attendee.data,
        });
      } catch (err) {
        return next(err);
      }
}

exports.createAccomodation = async (req, res, next) => {
  try {
    const id = req.params.id;
    const token = req.params.token;

    const valid = validateToken(id, token);
    if (!valid) throw (err = 'Not Valid');

    const data = req.body || {};
    const results = await AccommodationSelections.create(data);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
}

exports.getAccomodations = async (req, res, next) => {
  try {
    const results = await Accommodations.findAll();
    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return next(err);
  }
}