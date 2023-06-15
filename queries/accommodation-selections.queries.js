/*!
 * Recipients SQL queries
 * File: accommodation-selections.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { transactionOne, query, queryOne } = require("../db");
const uuid = require("uuid");
const {
  findById,
  update,
  queries,
  attachReferences,
} = require("./default.queries");
const defaults = require("./default.queries");

/**
 *  Accommodation-selections custom queries
 * - insert (stub)
 * */

const accommodationSelectionsQueries = {
  insert: (data) => {
    // destructure  data
    const { attendee = null, accommodation = null, guest = 0 } = data || {};
    
    return {
      sql: `INSERT INTO accommodation_selections (accommodation, attendee) VALUES (
        $1::varchar,
        $2::uuid
    ) ON CONFLICT DO NOTHING`,
      data: [accommodation, attendee],
    };
  },
  remove: (id) => {
      return { 
        sql: `DELETE FROM accommodation_selections WHERE attendee = $1::uuid;`,
        data: [id] 
      };
  },
};

exports.queries = accommodationSelectionsQueries;

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.insert = async (data) => {
  return await transactionOne([accommodationSelectionsQueries.insert(data)]);
};

exports.remove = async (id) => {
  return await queryOne(accommodationSelectionsQueries.remove(id));
};


/**
 * Default transactions
 * @public
 */

exports.findById = findById;
