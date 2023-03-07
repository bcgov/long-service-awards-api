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
// const fs = require("fs");

// template directory
const dirPath = '/resources/email_templates/';

/**
 * Configure Nodemailer:
 * - create reusable transporter object using the default SMTP transport
 */

let transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: process.env.MAIL_PORT,
  secure: false, // true for 465, false for other ports
  pool: true
});

/**
 * Send mail
 * @param subject
 * @param to
 * @param template
 * @param data
 * @param callback
 * @param attachments
 * @param options
 */

const sendMail = async (
    to,
    subject,
    template,
    data,
    attachments,
    callback=console.log,
    options={}) => {

  try {
    // set mail parameters
    const fromName = process.env.MAIL_FROM_NAME || 'LSA';
    const fromEmail = process.env.MAIL_FROM_ADDRESS || 'no-reply@gov.bc.ca';
    const templatePath = path.join(__dirname, '..', dirPath, template);
    const templateData = {...{title: subject}, ...data};

    // generate html body using template file
    ejs.renderFile(templatePath, templateData, options, async (err, body) => {
      // send mail with defined transport object
      console.log({
        from: `"${fromName.value}" <${fromEmail.value}>`, // sender address
        to: to.join(', '), // list of receivers
        subject: subject, // subject line
        html: body, // html body
      })
      try {
        callback(await transporter.sendMail({
          from: `"${fromName.value}" <${fromEmail.value}>`, // sender address
          to: to.join(', '), // list of receivers
          subject: subject, // subject line
          html: body, // html body
        }))
      }  catch (e) {
        console.error(e)
        throw new Error('emailTemplateError');
      }
    });
  }  catch (e) {
    console.error(e)
    throw new Error('emailTemplateError');
  }

}

/**
 * Send registration email confirmation
 * @param recipient
 */

module.exports.sendRegistrationConfirmation = async (recipient) => {

  // check status of registration
  const {service, supervisor, contact} = recipient || {};
  const {confirmed} = service || {};

  // check if registration is confirmed
  if (!confirmed) return;

  // send confirmation mail to supervisor
  await sendMail(
      [supervisor.office_email || ''],
      'Long Service Award - Registration Confirmation',
      'email-supervisor-registration-confirm.ejs',
      recipient
  );

  // send confirmation mail to recipient
  await sendMail(
      [contact.office_email || ''],
      'Long Service Award - Registration Confirmation',
      'email-recipient-registration-confirm.ejs',
      recipient
  );
}





