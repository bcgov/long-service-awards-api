/*!
 * RSVP controller
 * File: rsvp.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const { sendRSVPConfirmation, sendTEST } = require("../services/mail.services");
const Attendees = require("../models/attendees.model.js");
const Accommodations = require("../models/accommodations.model.js");
const AccommodationSelections = require("../models/accommodation-selection.model.js");
const { convertDate } = require("../services/validation.services.js");
const { deleteToken, validateToken } = require("../services/cache.services");
/**
 * Send invite emails for selected recipients
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const id = req.params.id;
    const token = req.params.token;

    const valid = await validateToken(id, token);

    if (!valid) return next(Error("noToken"));

    const results = await Attendees.findById(id);
    if (!results) return next(Error("noToken"));
    else res.status(200).json(results.data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = req.body;
    const id = req.params.id;
    const token = req.params.token;
    // const valid = await validateToken(id, token);
    const accept = req.body.attendance_confirmed;

    // if (!valid) throw (err = "Not Valid");

    const recipient_attendee = await Attendees.findById(data.id);

    // handle exception
    if (!recipient_attendee) return next(Error("noRecord"));

    // recreate accommodations to have only attendee, accommodation fields to match the model
    let accommodationsArr = [];
    if (data.recipient_accommodations) {
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
    await AccommodationSelections.remove(recipient_attendee.id);
    await recipient_attendee.save(data);

    // Clear any existing guest attendees of the recipient, also removes it's selections
    await Attendees.removeGuests(data.recipient.id);

    let guestID = undefined;
    // When form has guest data, create guest, and get ID for attaching accommodations to guestID
    if (data.guest_count > 0) {
      guestID = (await Attendees.saveGuest(data)).id;
    }

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

      const guest_attendee = await Attendees.findById(guestID);
      let guestData = guest_attendee.data;
      guestData.accommodations = guestAccommodationsArr;
      await guest_attendee.save(guestData);
    }

    let email = recipient_attendee.data.recipient.contact.office_email;
    // Create 48 hour grace period
    const todayPlusGracePeriod = new Date();
    todayPlusGracePeriod.setDate(todayPlusGracePeriod.getDate() + 2);

    if (recipient_attendee.data.recipient.retirement_date != null) {
      let retirement_date = recipient_attendee.data.recipient.retirement_date;
      if (retirement_date < todayPlusGracePeriod)
        email = recipient_attendee.data.recipient.contact.personal_email;
    }

    // Send RSVP confirmation
    await sendRSVPConfirmation(data, email, accept);

    if ((await deleteToken(id)) != 1) throw (err = "Key deletion failure");

    res.status(200).json({
      message: {},
      result: recipient_attendee.data,
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
    for (let i = 0; i < n; i++) {
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
