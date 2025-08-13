/*!
 * Reports controller
 * File: reports.controller.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const Recipient = require("../models/recipients.model.js");
const Attendee = require("../models/attendees.model.js");
const Ceremony = require("../models/ceremonies.model.js");
const Transactions = require("../models/transactions.model.js");
const QualifyingYear = require("../models/qualifying-years.model.js");
const { Readable } = require("stream");
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
  res.set("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.on("error", (err) => {
    console.error("Error in write stream:", err);
  });
  let rs = new Readable();

  rs.pipe(res);
  rs.on("error", function (err) {
    console.error(err);
    res.status(404).end();
  });
  rs.push("\ufeff" + data);
  rs.push(null);
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

exports.lsa = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();
    const cycleName = String(cycle.name);
    // define filter
    const filter = {
      cycle: cycleName,
      milestones: "25,30,35,40,45,50,55",
    };

    // apply query filter to results
    const recipients = await Recipient.report(filter, res.locals.user, cycle);
    const filename = `long-services-awards-report-${cycle}.csv`;

    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: "\n" });
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
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();
    const cycleName = String(cycle.name);
    // define filter
    const filter = { cycle: cycleName };

    // apply query filter to results
    const recipients = await Recipient.report(filter, res.locals.user, cycle);
    const filename = `service-pins-report-${cycle}.csv`;
    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: "\n" });
    pipeCSV(res, csvData, filename);
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate attendees report
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.attendees = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();
    const cycleName = String(cycle.name);
    // define filter
    const filter = { cycle: cycleName };

    // apply query filter to results
    const attendees = await Attendee.report(filter, res.locals.user, cycle);
    //console.log(attendees);
    const filename = `attendees-report-${cycle}.csv`;
    // convert json results to csv format
    const csvData = Papa.unparse(attendees, { newline: "\n" });
    pipeCSV(res, csvData, filename);
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate transactions report
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.transactions = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();
    const transactions = await Transactions.report(res.locals.user, cycle);
    const filename = `attendees-report-${cycle}.csv`;
    // convert json results to csv format
    const csvData = Papa.unparse(transactions, { newline: "\n" });
    pipeCSV(res, csvData, filename);
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate transactions report
 *
 * @param req
 * @param res
 * @param {Function} next
 * @method get
 * @src public
 */

exports.pecsf = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();
    const cycleName = String(cycle.name);

    // define filter
    const filter = {
      cycle: cycleName,
      milestones: "25,30,35,40,45,50,55",
      pecsf: "true",
    };

    // apply query filter to results
    const recipients = await Recipient.report(filter, res.locals.user, cycle);
    const filename = `pecsf-certificates-report-${cycle}.csv`;

    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: "\n" });
    pipeCSV(res, csvData, filename);
  } catch (err) {
    return next(err);
  }
};

exports.count = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
    const cycle = queryYear
      ? await QualifyingYear.findYear(queryYear)
      : await QualifyingYear.findCurrent();

    const cycleName = String(cycle.name);

    // define filter
    const filter = {
      cycle: cycleName,
      milestones: "25,30,35,40,45,50,55",
    };

    // apply query filter to results
    const recipients = await Ceremony.report(res.locals.user, cycleName);
    const filename = `award-counts-per-ceremony-${cycle}.csv`;

    // convert json results to csv format
    const csvData = Papa.unparse(recipients, { newline: "\n" });
    pipeCSV(res, csvData, filename);
  } catch (err) {
    return next(err);
  }
};

// LSA-516 Create report that lists duplicate entries for selected cycle based on employee numbers
exports.duplicatesInCycle = async (req, res, next) => {
  try {
    // get requested LSA cycle
    const queryYear = req.query.year !== null ? req.query.year : null;
   
    const filename = `duplicates-per-cycle-${queryYear}.csv`;

    const duplicates = await Recipient.duplicatesInCycle(queryYear);

    const test = !true;

    const csvData = Papa.unparse(duplicates || [ ['Duplicates'], ['None for Cycle'] ], { newline: test ? "<br />" : "\n" });

    if ( test ) {

      return res.status(200).send(csvData)
    }

    pipeCSV(res, csvData, filename);
    
  } catch (err) {
    return next(err);
  }

}