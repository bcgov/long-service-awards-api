/*!
 * Reports controller
 * File: reports.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const QualifyingYear = require("../models/qualifying-years.model.js");
const {Readable} = require("stream");
const Papa = require("papaparse");

/**
 * Create CSV data stream and pipe to response
 *
 * @param res
 * @param data
 * @param filename
 * @method get
 * @src public
 */

const pipeCSV = (res, data, filename) => {
  res.set('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.on('error', (err) => {
    console.error('Error in write stream:', err);
  });
  let rs = new Readable();

  rs.pipe(res);
  rs.on('error',function(err) {
    console.error(err)
    res.status(404).end();
  });
  rs.push(data);
  rs.push(null);
}

/**
 * Generate recipients report
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.lsa = async (req, res, next) => {
  try {

    // get current LSA cycle
    const cycle = await QualifyingYear.findCurrent();

    // define filter
    const filter = {
        cycle: String(cycle.name),
        milestones: '25,30,35,40,45,50,55'
    };

    // apply query filter to results
    const recipients = await Recipient.report(filter, res.locals.user, cycle);
    const filename = `long-services-awards-report-${cycle}.csv`;

    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: '\n' });
    pipeCSV(res, csvData, filename);

  } catch (err) {
    return next(err);
  }
};

/**
 * Generate recipients report
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.servicePins = async (req, res, next) => {
  try {

    // get current LSA cycle
    const cycle = await QualifyingYear.findCurrent();

    // define filter
    const filter = {
      confirmed: 'true'
    };

    // apply query filter to results
    const recipients = await Recipient.report(filter, res.locals.user, cycle);
    const filename = `service-pins-report-${cycle}.csv`;
    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: '\n' });
    pipeCSV(res, csvData, filename);

  } catch (err) {
    return next(err);
  }
};
