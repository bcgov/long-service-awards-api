/*!
 * Recipients SQL queries
 * File: recipients.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { transactionOne, query, queryOne } = require("../db");
const uuid = require("uuid");
const { findById, queries, attachReferences } = require("./default.queries");
const defaults = require("./default.queries");

/**
 * Recipient custom queries
 * - findall
 * - insert (stub)
 * - update
 * - stats (recipients aggregate stats)
 * */

const attendeesQueries = {
  insert: (data) => {
    // destructure user stub data
    const {
      id = null,
      recipient = null,
      ceremony = null,
      guest = 0,
      status = null,
    } = data || {};

    return {
      sql: `WITH upsert AS (
            UPDATE attendees
            SET ceremony = $3::uuid
            WHERE attendees.recipient = $2::uuid
            RETURNING *
            )
            INSERT INTO attendees (id, recipient, ceremony, guest, status) 
            SELECT $1::uuid,$2::uuid,$3::uuid,$4::integer,$5::varchar
            WHERE NOT EXISTS (SELECT * FROM upsert)
            ON CONFLICT DO NOTHING
            RETURNING *;`,
      data: [id, recipient, ceremony, guest, status],
    };
  },
  findRecipient: (id) => {
    return {
      sql: `SELECT recipients.* FROM recipients
                  JOIN attendees ON recipients.id = ${id}
                  WHERE attendees.id = $1::uuid;`,
      data: [id],
    };
  },
};
exports.queries = attendeesQueries;

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.insert = async (data) => {
  // generate UUID for recipient
  data.id = uuid.v4();
  return await transactionOne([attendeesQueries.insert(data)]);
};

exports.findRecipient = async (id, type, schema) => {
  const result = await queryOne(attendeesQueries.findRecipient(id, type));
  return await attachReferences(result, schema);
};
