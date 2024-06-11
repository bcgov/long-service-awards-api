/*!
 * Attendees controller
 * File: attendees.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const Attendees = require("../models/attendees.model.js");
const Settings = require("../models/settings.model.js");
const AccommodationSelections = require("../models/accommodation-selection.model.js");
const uuid = require("uuid");
const { sendRSVP } = require("../services/mail.services");
const { rsvpToken, validateToken } = require("../services/cache.services");
const { convertDate } = require("../services/validation.services.js");

/**
 * Retrieve all records.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.getAll = async (req, res, next) => {
  try {
    const { total_filtered_records } = await Attendees.count(
      req.query,
      res.locals.user
    );
    const attendees = await Attendees.findAll(req.query);
    return res.status(200).json({ attendees, total_filtered_records });
  } catch (err) {
    console.error(err);
    return next(err);
  }
  // try {
  //   // apply query filter to results
  //   const attendees = await Attendees.findAll(req.query, res.locals.user);

  //   // send response
  //   res.status(200).json({
  //     message: {
  //       severity: "success",
  //       summary: "Attendees Record(s) Found",
  //       detail: "Attendees records found.",
  //     },
  //     result: { attendees, total_filtered_records },
  //   });
  // } catch (err) {
  //   return next(err);
  // }
};

/**
 * Retrieve record by ID.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.get = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const results = await Attendees.findById(id);
    res.status(200).json(results.data);
  } catch (err) {
    return next(err);
  }
};

/**
 * Retrieve attendee record by ceremony ID.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.getByCeremony = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const results = await Attendees.findByCeremony(id);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

/**
 * Create new record.
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method post
 * @src public
 */

exports.create = async (req, res, next) => {
  try {
    const data = req.body || {};
    const attendees = [];

    data.recipients.forEach(async (r) => {
      const id = uuid.v4();
      await Attendees.create({
        id: id,
        recipient: r,
        ceremony: data.ceremony.id,
      });
      const attendee = await Attendees.findById(id);

      attendees.push(attendee);
    });

    if (attendees != undefined) {
      res.status(200).json({
        message: {
          severity: "success",
          summary: "Add Attendee(s)",
          detail: "New Attendee(s) record created.",
        },
        result: attendees,
      });
    }
  } catch (err) {
    return next(err);
  }
};

/**
 * Update record.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.update = async (req, res, next) => {
  try {
    const data = req.body;
    const attendee = await Attendees.findById(data.id);

    // handle exception
    if (!attendee) return next(Error("noRecord"));

    // recreate accommodations to have only attendee, accommodation fields to match the model
    let accommodationsArr = [];
    if (data.accommodation_selections && data.accommodation_selections[0]) {
      Object.keys(data.accommodation_selections[0]).forEach(async (key) => {
        if (data.accommodation_selections[0][key] === true) {
          accommodationsArr.push(
            JSON.parse(
              '{"accommodation": "' + key + '", "attendee": "' + data.id + '"}'
            )
          );
        }
      });

      data.accommodations = accommodationsArr;
    }

    // Clear accommodations before saving - otherwise saving is only additive (won't remove unchecked)
    await AccommodationSelections.remove(attendee.id);
    await attendee.save(data);

    res.status(200).json({
      message: {},
      result: attendee.data,
    });
  } catch (err) {
    return next(err);
  }
};
exports.addGuest = async (req, res, next) => {
  try {
    const data = req.body;

    const recipient_attendee = await Attendees.findById(data.id);

    // handle exception
    if (!recipient_attendee) return next(Error("noRecord"));

    const total_attendees = await Attendees.findByRecipient(data.recipient.id);
    if (total_attendees.count > 1) return next(Error("guestExists"));

    let guestID = undefined;
    // When form has guest data, create guest, and get ID for attaching accommodations to guestID
    if (data.guest_count > 0) {
      guestID = (await Attendees.saveGuest(data)).id;
    }
    //} else {
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
    //}
    res.status(200).json({
      message: {},
      result: recipient_attendee.data,
    });
  } catch (err) {
    return next(err);
  }
};
/**
 * Remove record.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const results = await Attendees.remove(id);
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

/**
 * Remove all records.
 *
 * @param req
 * @param res
 * @param next
 * @src public
 */

exports.removeAll = async (req, res, next) => {
  try {
    const results = await Attendees.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};

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
    const development =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "testing";
    let email = recipient.contact.office_email;

    if (recipient.contact.alternate_is_preferred === true) {
      email = recipient.contact.personal_email;
    }

    let response = null;

    // Create 48 hour grace period
    const todayPlusGracePeriod = new Date();
    todayPlusGracePeriod.setDate(todayPlusGracePeriod.getDate() + 2);

    if (recipient.retirement_date != null) {
      let retirement_date = new Date(convertDate(recipient.retirement_date));
      if (retirement_date < todayPlusGracePeriod)
        email = recipient.contact.personal_email;
    }

    if (development && res.locals && res.locals.user && res.locals.user.email) {
      email = res.locals.user.email;
    }

    var RsvpSendDate = new Date(); //today
    // var deadline = new Date("Jul 28, 2023 23:59:59"); // Needs to be improved and user-configurable - LSA-404

    // const deadline = await Settings.findById("rsvp-deadline"); - WHY THIS DOESN'T WORK?

    const settings = await Settings.findAll();
    const currentYear = new Date().getFullYear();
    const deadline =
      settings.find((s) => s?.name === "rsvp-deadline")?.value ||
      `Jul 28, ${currentYear} 23:59:59`;

    const expiry = Math.ceil(
      Math.abs(RsvpSendDate.getTime() - new Date(deadline).getTime()) / 1000
    );
    const token = await rsvpToken(data.id, expiry);
    const valid = await validateToken(data.id, token);
    if (valid) {
      response = await sendRSVP({
        email,
        link: `${process.env.LSA_APPS_ADMIN_URL}/rsvp/${data.id}/${token}`,
        attendee: data,
        deadline: deadline,
      });
      return res.status(200).json({
        message: "success",
        response: response,
      });
    } else {
      return res.status(500).json({
        message: "failure",
        response: response,
      });
    }
  } catch (err) {
    return next(err);
  }
};
