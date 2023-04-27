/*!
 * Ceremonies controller
 * File: ceremonies.controller.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const ceremoniesModel = require("../models/ceremonies.model.js");
const uuid = require("uuid");

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
    const ceremonies = await ceremoniesModel.findAll();
    return res.status(200).json({
      message: {
        severity: 'success',
        summary: 'Ceremony Record(s) Found',
        detail: 'Ceremony records found.'
      },
      result: {ceremonies}
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
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
    const {id} = req.params || {};
    const results = await ceremoniesModel.findById(id);
    res.status(200).json({
      message: {},
      result: results,
    });
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
    const guid = uuid.v4();
    const data = req.body || {};
    await ceremoniesModel.create({
      id: guid,
    });
    const ceremony = await ceremoniesModel.findById(guid);
    if (ceremony != undefined)
    {
      res.status(200).json({
        message: { 
          severity: 'success', 
          summary: 'Add Ceremony', 
          detail: 'New ceremony record created.'
        },
        result:{ceremony}});
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

// TODO: need to update address attachment
exports.update = async (req, res, next) => {
  try {
    const data = req.body;
    const ceremony = await ceremoniesModel.findById(data.id);

    // handle exception
    if (!ceremony) return next(Error('noRecord'));
    ceremony.save();

    res.status(200).json({
      message: {},
      result: ceremony.data
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
    const results = await ceremoniesModel.remove(id);
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
    const results = await ceremoniesModel.removeAll();
    res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
};
