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
const { decodeError } = require("../error");
const { format } = require("date-fns");
const exp = require("constants");
const { generatePDFCertificate } = require("./pdf.services");

// template directory
const dirPath = "/resources/email_templates/";

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
  const transaction = {
    recipient: id,
    error: !!error,
    code: error ? "failedMailSend" : "successMailSend",
    description: `${msg ? msg : "Error not indexed"} (${
      hint ? hint : "N/A"
    })`.slice(0, 256),
    details: `[${JSON.stringify(error)}, ${JSON.stringify(response)}]`,
  };

  // include user ID if present
  if (user) {
    const { id } = user || {};
    transaction.user = id || null;
  }

  // log event in transaction table
  await Transaction.create(transaction);
};

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
  attachments
  // options={},
) => {
  // set mail parameters
  const templatePath = path.join(__dirname, "..", dirPath, template);
  const templateData = { ...{ title: subject }, ...data };

  try {
    /**
     * Configure Nodemailer:
     * - create reusable transporter object using the default SMTP transport
     */

    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_SERVER,
      port: process.env.MAIL_PORT,
      secure: false, // true for 465, false for other ports
      pool: true,
    });

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

        const base64Content = attachment.content
          ? attachment.content
          : Buffer.from(fileContent).toString("base64");

        attachmentArray.push({
          filename: attachment.filename,
          content: base64Content,
          contentType: attachment.contentType || "application/octet-stream", // default content type
        });
      }
    }
    const response = await transporter.sendMail({
      from: `"${fromName}" <${from}>`, // sender address
      to: to.join(", "), // list of receivers
      subject: subject, // subject line
      html: body, // html body
      attachments: attachmentArray, // Add attachments array to the options object
    });
    // log send event
    await _logMail(null, response, data);
    // return mail send response
    return [null, response];
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
  const { service, supervisor, contact, organization } = recipient || {};
  const { confirmed, milestone } = service || {};
  const isLSA = milestone >= 25;
  const development =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "testing";

  // check if registration is confirmed
  if (!confirmed) return;

  // select confirmation email
  // - LSA registrations (milestone >= 25)
  // - Service Pin registration (milestone < 25)

  let contactEmail = contact.office_email;

  if (contact.alternate_is_preferred === true) {
    contactEmail = contact.personal_email;
  }

  if (development && user && user.email) {
    contactEmail = user.email;
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
    [
      development && user && user.email
        ? user.email
        : supervisor.office_email || "",
    ],
    subject,
    supervisorTemplate,
    recipient,
    from,
    fromName,
    [],
    null
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
    null
  );

  return [error1 || error2 || null, { response1, response2 }];
};

/**
 * Send user reset password link
 * @param link
 */
module.exports.sendResetPassword = async (data) => {
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
    null
  );
};

module.exports.sendRSVP = async (data) => {
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
        ? `${attendee.ceremony.address.street1}, ${
            attendee.ceremony.address.street2
              ? attendee.ceremony.address.street2
              : ""
          }`
        : `${
            attendee.ceremony.address.street2
              ? attendee.ceremony.address.street2
              : ""
          }`
    }`,
    CityProvince: `${attendee.ceremony.address.community}, ${attendee.ceremony.address.province}`,
  };
  const certificateAttachment = await generatePDFCertificate(
    certificateTemplate,
    certificateData
  );
  // send confirmation mail to supervisor
  return await sendMail(
    [email],
    "Your Long Service Awards Invitation",
    "email-recipient-ceremony-invitation.ejs",
    {
      link: link,
      attendee: attendee,
      expiry: expiry,
      deadline: new Date(deadline).toLocaleDateString("en-us", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
    process.env.MAIL_FROM_ADDRESS,
    process.env.MAIL_FROM_NAME,
    [
      {
        filename: "LSAInvitation.pdf",
        content: certificateAttachment,
        contentType: "application/pdf",
      },
    ],
    null
  );
};

module.exports.sendRSVPConfirmation = async (data, email, accept = true) => {
  const attendee = data || {};

  // //format ceremony date for email
  // Object.assign(attendee.ceremony, {
  //   ...attendee.ceremony,
  //   datetime_formatted: `${format(
  //     new Date(attendee.ceremony.datetime),
  //     `EEEE, MMMM dd, yyyy`
  //   )}`,
  // });

  // send confirmation mail to supervisor
  if (accept) {
    return await sendMail(
      [email],
      "Confirmation to Attend the Long Service Awards Ceremony",
      "email-recipient-ceremony-rsvp-accept-updated.ejs",
      attendee,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      null
    );
  } else {
    return await sendMail(
      [email],
      "Confirmation to Not Attend the Long Service Awards Ceremony",
      "email-recipient-ceremony-rsvp-decline-updated.ejs",
      attendee,
      process.env.MAIL_FROM_ADDRESS,
      process.env.MAIL_FROM_NAME,
      [],
      null
    );
  }
};

/**
 * Send test n  emails to test sending limits - sends to  (and from) MAIL_FROM_ADDRESS env var
 * @param link
 */
module.exports.sendTEST = async () => {
  // send test emails
  return await sendMail(
    [process.env.SUPER_ADMIN_EMAIL],
    "Long Service Awards: TEST EMAIL",
    "email-user-reset-password.ejs",
    { link: "sendTEST EMAIL TEST" },
    process.env.MAIL_FROM_ADDRESS,
    process.env.MAIL_FROM_NAME,
    [],
    null
  );
};
