/*!
 * Mail processing services
 * File: mail.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

"use strict";
const ejs = require("ejs");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const Transaction = require("../models/transactions.model");
const ServiceSelection = require("../models/service-selections.model");
const AwardSelection = require("../models/award-selections.model");
const Awards = require("../models/awards.model");
const { decodeError } = require("../error");
const chesService = require("../services/ches.services");

const exp = require("constants");
const { generatePDFCertificate } = require("./pdf.services");
const { format, formatInTimeZone } = require("date-fns-tz");

/**
 * Health Check endpoint for CHES
 * @param {*} req
 * @param {*} res
 */

module.exports.healthCheck = async (req, res) => {
  try {
    const result = await chesService.healthCheck();

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Health Check:",
      result: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

/**
 * Updates all transaction logs where queued status column is set to true.
 * If the message failed to send, it will also update the transactions error description.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
module.exports.updateQueued = async (req, res, next) => {
  const queued = await Transaction.findByFields(["queued"], [true]);
  for (const email of queued) {
    const statusData = await chesService.transactionStatus(email.txid);
    if (statusData.status === "completed" || statusData.status === "failed") {
      const updated = await Transaction.updateTransactionQueueStatus(
        email.txid,
        false
      );
      console.log("Updated, ", updated);
    }
    if (statusData.status === "failed") {
      Transaction.updateTransactionError(
        email.txid,
        statusData.smtpResponse.response
      );
    }
  }
  console.log("Queued, ", queued);

  res.status(200).json({
    success: true,
    message: "Updated queued transactions",
    result: queued,
  });
};

/**
 * Log mail event
 * @param error
 * @param recipient
 * @param response
 * @private
 */

const _logMail = async (error, response, recipient) => {
  const parsedError = error
    ? decodeError(error)
    : { hint: "N/A", msg: "Mail delivered successfully" };
  const { hint, msg } = parsedError || {};
  const { id, user } = !!recipient.recipient
    ? recipient.recipient
    : recipient || {};

  const detailString = `[${JSON.stringify(error)}, ${JSON.stringify(
    response.data
  )}]`;

  const transaction = {
    recipient: id || null,
    txid: response.data ? response.data.txId : null,
    queued: !error ? true : false,
    error: !!error,
    code: error ? "failedMailSend" : "successMailSend",
    description: `${msg ? msg : "Error not indexed"} (${
      hint ? hint : "N/A"
    })`.slice(0, 256),
    details: detailString,
  };

  // include user ID if present
  if (user) {
    const { id } = user || {};
    transaction.user = id || null;
  }

  // log event in transaction table
  await Transaction.create(transaction);
};

// template directory
const dirPath = "/resources/email_templates/";
/**
 * Send mail
 * @param subject
 * @param to
 * @param template
 * @param data
 * @param from
 * @param fromName
 // * @param attachments
 // * @param options
 */
const sendMail = async (
  to,
  subject,
  template,
  data,
  from,
  fromName,
  attachments,
  user
  // options={},
) => {
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param

  // set mail parameters
  const templatePath = path.join(__dirname, "..", dirPath, template);
  const templateData = { ...{ title: subject }, ...data };

  try {
    // generate html body using template file
    const body = await ejs.renderFile(templatePath, templateData, {
      async: true,
    });

    // Read attachments and convert them to base64 format
    const attachmentArray = [];
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        const fileContent = attachment.content
          ? attachment.content
          : fs.readFileSync(attachment.path);

        //LSA-546: Convert attachment.content to base64
        const base64Content = attachment.content
          ? Buffer.from(attachment.content).toString("base64")
          : Buffer.from(fileContent).toString("base64");

        attachmentArray.push({
          filename: attachment.filename,
          content: base64Content,
          contentType: attachment.contentType || "application/octet-stream", // default content type
          encoding: "base64",
        });
      }
    }

    const development =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "testing";

    if (development && user && user.email) {
      to = [user.email];
    }

    var fromString = `${fromName} <${from}>`;

    const response = await chesService.sendEmail({
      from: fromString, // sender address
      to: to, // list of receivers
      subject: subject, // subject line
      body: body, // html body
      bodyType: "html",
      attachments: attachmentArray, // Add attachments array to the options object
    });
    // log send event
    await _logMail(null, response, data);
    // return mail send response
    // return only response.data, as response contains too much info and causes circular json error somewhere
    return [null, response.data];
  } catch (error) {
    console.error(error);
    // log error as transaction record
    _logMail(
      error,
      {
        from: `"${fromName}" <${from}>`,
        to: to.join(", "),
        subject: subject,
      },
      data
    ).catch(console.error);
    return [error, null];
  }
};

/**
 * Send registration email confirmation
 * @param recipient
 */
module.exports.sendRegistrationConfirmation = async (recipient, user) => {
  // check status of registration
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param
  const { service, supervisor, contact, organization } = recipient || {};
  const { confirmed, milestone } = service || {};
  const isLSA = milestone >= 25;

  // check if registration is confirmed
  if (!confirmed) return;

  // select confirmation email
  // - LSA registrations (milestone >= 25)
  // - Service Pin registration (milestone < 25)

  let contactEmail = contact.office_email;

  if (contact.alternate_is_preferred === true) {
    contactEmail = contact.personal_email;
  }

  const from = isLSA
    ? process.env.MAIL_FROM_ADDRESS
    : "Corporate.Engagement@gov.bc.ca";

  const fromName = isLSA ? process.env.MAIL_FROM_NAME : "Corporate Engagement";

  const subject = isLSA
    ? "Long Service Awards - Registration Confirmation"
    : "Service Pins - Registration Confirmation";

  const recipientTemplate = isLSA
    ? "email-recipient-registration-confirm.ejs"
    : "email-recipient-service-pins-confirm.ejs";

  const supervisorTemplate = isLSA
    ? "email-supervisor-registration-confirm.ejs"
    : organization.bulk
    ? "email-supervisor-service-pins-bulkship-confirm.ejs"
    : "email-supervisor-service-pins-confirm.ejs";

  // send confirmation mail to supervisor
  const [error1, response1] = await sendMail(
    [supervisor.office_email || ""],
    subject,
    supervisorTemplate,
    recipient,
    from,
    fromName,
    [],
    user
  );

  // send confirmation mail to recipient
  const [error2, response2] = await sendMail(
    [contactEmail || ""],
    subject,
    recipientTemplate,
    recipient,
    from,
    fromName,
    [],
    user
  );

  /* 
    LSA-546 Check for errors and throws any errors (if present)
  */

  if (error1 != null || error2 != null) {
    console.error(
      "Error sending registration confirmation email: ",
      error1,
      error2
    );
    throw new Error(error1 || error2);
  } else {
    return [error1 || error2 || null, { response1, response2 }];
  }
};

/**
 * Send user reset password link
 * @param link
 */
module.exports.sendResetPassword = async (data, user) => {
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param
  const { email, link } = data || {};

  // send confirmation mail to supervisor
  return await sendMail(
    [email],
    "Long Service Awards: Reset Admin User Password",
    "email-user-reset-password.ejs",
    { link: link },
    process.env.MAIL_FROM_ADDRESS,
    process.env.MAIL_FROM_NAME,
    [],
    user
  );
};

// LSA-510 Send reminder email for ceremony
module.exports.sendReminder = async (data, user) => {
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param
  const { email, attendee, cycleYear } = data || {};

  const [error, response] = await sendMail(
    [email],
    "Your Long Service Awards Ceremony Reminder",
    "email-recipient-ceremony-reminder.ejs",
    {
      cycleYear,
      attendee: attendee,
    },
    process.env.MAIL_FROM_ADDRESS,
    process.env.MAIL_FROM_NAME,
    [],
    user
  );

  /* 
    LSA-546 Check for errors and throws any errors (if present)
  */

  if (error != null) {
    console.error("Error sending reminder email: ", error);
    throw error;
  }

  return response;
};

module.exports.sendRSVP = async (data, user) => {
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param
  const { email, link, attendee, deadline } = data || {};
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14);

  //generate PDF Certificate attachment
  const certificateTemplate = "invitation_certificate";
  const certificateData = {
    Name: `${attendee.recipient.contact.first_name} ${attendee.recipient.contact.last_name}`,
    Date: `${attendee.ceremony.datetime_formatted}`,
    Address1: `${
      attendee.ceremony.venue
        ? attendee.ceremony.venue
        : attendee.ceremony.address.street1
    }`,
    Address2: `${
      attendee.ceremony.venue
        ? `${attendee.ceremony.address.street1}${
            attendee.ceremony.address.street2
              ? ", " + attendee.ceremony.address.street2
              : ""
          }`
        : `${
            attendee.ceremony.address.street2
              ? attendee.ceremony.address.street2
              : ""
          }`
    }`,
    CityProvince: `${attendee.ceremony.address.community}, ${attendee.ceremony.address.province}`,
    Time: `${formatInTimeZone(
      new Date(attendee.ceremony.datetime),
      "PST",
      `p`
    )}`,
  };
  const fontData = {
    Name: { font: "TimesRomanBold", size: 16 },
    Date: { font: "TimesRomanBold", size: 14 },
    Address1: { font: "CormorantGaramond-Light", size: 20 },
    Address2: { font: "CormorantGaramond-Light", size: 20 },
    CityProvince: { font: "CormorantGaramond-Light", size: 20 },
    Time: { font: "TimesRomanBoldItalic", size: 14 },
  };

  return await generatePDFCertificate(
    certificateTemplate,
    certificateData,
    fontData
  ).then(async (pdfCertificate) => {
    const [error, response] = await sendMail(
      [email],
      "Your Long Service Awards Invitation",
      "email-recipient-ceremony-invitation.ejs",
      {
        link: link,
        attendee: attendee,
        expiry: expiry,
        deadline: `${formatInTimeZone(
          new Date(deadline),
          "PST",
          `MMMM dd, yyyy`
        )}`,
      },
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [
        {
          filename: "LSAInvitation.pdf",
          content: pdfCertificate,
          contentType: "application/pdf",
        },
      ],
      user
    );

    /* 
      LSA-546 Check for errors and throws any errors (if present)
    */
    if (error != null) {
      console.error("Error sending reminder email: ", error);
      return Promise.reject(error);
    }
    return Promise.resolve(response);
  });
};

module.exports.sendRSVPConfirmation = async (
  data,
  email,
  accept = true,
  user
) => {
  // LSA-522 Passing user object from res for development email sending. Confirmed that invoking functions send user param
  const attendee = data || {};

  // Fetch the service selection for the recipient
  const selection = await ServiceSelection.findByRecipient(
    attendee.recipient.id
  );

  if (selection && selection.length > 0) {
    const selectionId = selection[selection.length - 1].id;

    // Fetch the award details using the selection ID
    const awardsel = await AwardSelection.findById(selectionId);

    const award = await Awards.findById(awardsel.award);

    // Add the award name to the attendee object
    attendee.award = award ? award.label : "No award selected";
  } else {
    attendee.award = "No award selected";
  }

  // //format ceremony date for email
  // Object.assign(attendee.ceremony, {
  //   ...attendee.ceremony,
  //   datetime_formatted: `${format(
  //     new Date(attendee.ceremony.datetime),
  //     `EEEE, MMMM dd, yyyy`
  //   )}`,
  // });

  // send confirmation mail to supervisor

  let error, response;
  if (accept) {
    [error, response] = await sendMail(
      [email],
      "Confirmation to Attend the Long Service Awards Ceremony",
      "email-recipient-ceremony-rsvp-accept-updated.ejs",
      attendee,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      user
    );
  } else {
    [error, response] = await sendMail(
      [email],
      "Confirmation to Not Attend the Long Service Awards Ceremony",
      "email-recipient-ceremony-rsvp-decline-updated.ejs",
      attendee,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      user
    );
  }

  /* 
    LSA-546 Check for errors and throws any errors (if present)
  */

  if (error != null) {
    console.error("Error sending RSVP confirmation email: ", error);
    return Promise.reject(error);
  }
  return Promise.resolve(response);
};
