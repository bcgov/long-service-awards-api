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
 * - findall
 * - insert (stub)
 * - update
 * */

const accommodationSelectionsQueries = {
  insert: (data) => {
    // destructure  data
    const { attendee = null, accommodation = null } = data || {};

    return {
      sql: `WITH upsert AS (
            UPDATE accommodation_selections
            SET accommodation = $1::varchar
            WHERE attendee = $2::uuid
            RETURNING *
            )
            INSERT INTO accommodation_selections (accommodation, attendee) 
            SELECT $1::varchar,$2::uuid,
            WHERE NOT EXISTS (SELECT * FROM upsert)
            ON CONFLICT DO NOTHING
            RETURNING *;`,
      data: [accommodation, attendee],
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

/**
 * Default transactions
 * @public
 */

exports.findById = findById;
