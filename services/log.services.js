/*!
 * User transaction log services
 * File: auth.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

require('dotenv').config();
const Transaction = require("../models/transactions.model.js");

'use strict';

/**
 * Add transaction log
 *
 * @param req
 * @param res
 * @param {Array} allowedRoles
 * @src public
 */

exports.log = async (req, res, next) => {
  try {
    const data = {
      user: res.locals.user.id,
      code: 'Some error',

    }
    if (req.isAuthenticated()){
      await Transaction.create()
    }
    // reject unauthenticated users
    else return next(new Error('noAuth'));
  } catch (err) {
    return next(err)
  }
}


