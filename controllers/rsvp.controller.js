/*!
 * RSVP controller
 * File: rsvp.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const uuid = require("uuid");
const { sendRSVP, sendRSVPConfirmation, sendTEST } = require("../services/mail.services");
const Attendees = require("../models/attendees.model.js");
const Accommodations = require("../models/accommodations.model.js");
const AccommodationSelections = require("../models/accommodation-selection.model.js");

const {
  rsvpToken,
  deleteToken,
  validateToken
} = require("../services/cache.services");
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
    const gracePeriod = new Date();

    // Create 48 hour grace period
    gracePeriod.setDate(gracePeriod.getDate() - 2);
    if (
      recipient.retirement_date != null &&
      recipient.retirement_date < gracePeriod
    ) {
      email = recipient.contact.personal_email;
    }

    var RsvpSendDate = new Date(); //today
    var deadline = new Date("Jul 28, 2023 23:59:59"); // Needs to be improved and user-configurable - LSA-404
    const expiry = Math.ceil(Math.abs(RsvpSendDate.getTime() - deadline.getTime())/1000);
    const token = await rsvpToken(data.id, expiry);
    const valid = await validateToken(data.id, token);
    if (valid)
    {    
      const response = await sendRSVP({
        email,
        link: `${process.env.LSA_APPS_ADMIN_URL}/rsvp/${data.id}/${token}`,
        attendee: data,
      });

      return res.status(200).json({
        message: "success",
        response: response,
      });
  }
  else
  {
    return res.status(500).json({
      message: "failure",
      response: response,
    });
  }
  } catch (err) {
    return next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const id = req.params.id;
    const token = req.params.token;

    const valid = await validateToken(id, token);

    if (!valid) return next(Error('noToken'));

    const results = await Attendees.findById(id);
    if (!results) return next(Error('noToken'));

    else res.status(200).json(results.data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  console.log(req.body.ceremony);
  try {
    const data = req.body;
    const id = req.params.id;
    const token = req.params.token;
    const valid = await validateToken(id, token);
    const accept = req.body.attendance_confirmed;

    if (!valid) throw (err = "Not Valid");

    const attendee = await Attendees.findById(data.id);

    // handle exception
    if (!attendee) return next(Error("noRecord"));

    // recreate accommodations to have only attendee, accommodation fields to match the model
    let accommodationsArr = [];
    if (data.recipient_accommodations)
    {    
    Object.keys(data.recipient_accommodations).forEach(async (key) => {
      if (data.recipient_accommodations[key] === true) {
        accommodationsArr.push(
          JSON.parse(
            '{"accommodation": "' + key + '", "attendee": "' + data.id + '"}'
          )
        );
      }
    });
    
    data.accommodations = accommodationsArr;
  }

    // Clear accommodations before saving
    await AccommodationSelections.remove(attendee.id);
    await attendee.save(data);


    let guestID = undefined;
    // Create guest, and get ID for attaching accommodations to guestID
    if (data.guest_count > 0) guestID = (await Attendees.saveGuest(data)).id;

    if (data.guest_accommodations && guestID) {
      let guestAccommodationsArr = [];
      Object.keys(data.guest_accommodations).forEach(async (key) => {
        if (data.guest_accommodations[key] === true) {
          guestAccommodationsArr.push(
            JSON.parse(
              '{"accommodation": "' + key + '", "attendee": "' + guestID + '"}'
            )
          );
        }
      });

      const guest = await Attendees.findById(guestID);
      let guestData = guest.data;
      guestData.accommodations = guestAccommodationsArr;
      // Clear/reset guests
      await Attendees.removeGuests(data.recipient.id);
      await guest.save(guestData);
    }

    // Find guest if exists, or create new guest
    // then, save guest (WHERE guest = 1)

    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() - 2);
    // Create 48 hour grace period
    const email = attendee.data.recipient.contact.office_email;

    if (
      attendee.data.recipient.retirement_date != null &&
      attendee.data.recipient.retirement_date < gracePeriod
    )
      email = attendee.data.recipient.contact.personal_email;

    // Send RSVP confirmation
    sendRSVPConfirmation(attendee.data, email, accept);

    if (await deleteToken(id) != 1) throw (err = "Key deletion failure");

    res.status(200).json({
      message: {},
      result: attendee.data,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getAccommodations = async (req, res, next) => {
  try {
    const results = await Accommodations.findAll();
    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

// Send test emails (Remove for prod. For dev only.)
exports.sendTEST = async (req, res, next) => {
  try {
      const n = req.params.count;

      //Sends n emails at once!    
      for (let i=0; i < n; i++)
      {
      const response = await sendTEST();
      console.log("[EMAIL TEST]: " + JSON.stringify(response));
    }

    
      return res.status(200).json({
        message: "success",
        response: "See console",
      });
  

  } catch (err) {
    return next(err);
  }
};
