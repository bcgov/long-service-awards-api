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
const Transaction = require('../models/transactions.model')
const {decodeError} = require("../error");

// template directory
const dirPath = '/resources/email_templates/';


/**
 * Log mail event
 * @param error
 * @param recipient
 * @param response
 * @private
 */

const _logMail = async (error, response, recipient) => {

      const parsedError = decodeError(error);
      const {hint, msg} = parsedError || {};
      const {id, user} = recipient || {};

      // log event in transaction table
      await Transaction.save({
        user: user || null,
        recipient: id,
        error: !!error,
        code: 'failedMailSend',
        description: `${msg ? msg : 'Error not indexed'} (${hint ? hint : 'N/A'})`.slice(0, 256),
        details: `[${JSON.stringify(error)}, ${JSON.stringify(response)}]`
      })
    }

/**
 * Send mail
 * @param subject
 * @param to
 * @param template
 * @param data
 * @param attachments
 * @param options
 */

const sendMail = async (
    to,
    subject,
    template,
    data,
    attachments,
    options={}) => {

  try {

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

    // set mail parameters
    const fromName = process.env.MAIL_FROM_NAME;
    const fromEmail = process.env.MAIL_FROM_ADDRESS;
    const templatePath = path.join(__dirname, '..', dirPath, template);
    const templateData = {...{title: subject}, ...data};

    // generate html body using template file
    ejs.renderFile(templatePath, templateData, options, async (err, body) => {
      // send mail with defined transport object
      try {
        const response = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`, // sender address
          to: to.join(', '), // list of receivers
          subject: subject, // subject line
          html: body, // html body
        });
        // log send event
        await _logMail(null, response, data);
      }  catch (e) {
        // log send error
        _logMail(e, {
          from: `"${fromName}" <${fromEmail}>`, to: to.join(', '), subject: subject
        }, data).catch(console.error);
      }
    });
  }  catch (e) {
    console.error(e)
    throw new Error('badMailTemplate');
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





