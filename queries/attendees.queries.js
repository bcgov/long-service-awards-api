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
    console.log("HERE", data);
    // destructure user stub data
    const {
      id = null,
      recipient = null,
      ceremony = null,
      guest = 0,
      status = null,
    } = data || {};
    return {
      sql: `INSERT INTO attendees (id, recipient, ceremony, guest, status)
                  VALUES (
                             $1::uuid,
                             $2::uuid,
                             $3::uuid,
                             $4::integer,
                             $5::varchar
                         )
                  ON CONFLICT DO NOTHING
                  RETURNING *;`,
      data: [id, recipient, ceremony, guest, status],
    };
  },
  update: (data, schema) => {
    if (!schema.modelName) return null;

    // timestamp fields
    const timestamps = ["updated_at"];

    // filter ignored columns:
    const ignore = ["id", "created_at"];
    const cols = Object.keys(schema.attributes).filter(
      (key) => !ignore.includes(key)
    );

    // generate prepared statement value placeholders
    // - NOTE: index shift to account for ID and created datetime values
    let index = 2;
    const assignments = cols.map((attr) => {
      // handle timestamp placeholder defined in arguments
      const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

      // map returns conjoined prepared parameters in order
      return [
        `"${attr}"`,
        `${placeholder}::${schema.attributes[attr].dataType}`,
      ].join("=");
    });

    let sql = `        UPDATE attendees
                       SET ${assignments.join(",")}
                       WHERE id = $1::${schema.attributes.id.dataType}
                       RETURNING *;`;

    // position ID, creation datetime values at front of array
    let filteredData = [data.id];

    // filter input data to match update parameters
    filteredData.push(
      ...Object.keys(schema.attributes)
        .filter((key) => !ignore.includes(key) && !timestamps.includes(key))
        .map((key) => {
          return data[key];
        })
    );

    // DEBUG SQL
    // console.log('UPDATE:', {sql: sql, data: filteredData})

    // apply update query
    return { sql: sql, data: filteredData };
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

exports.update = async (data, schema) => {
  return await transactionOne([attendeesQueries.update(data, schema)]);
};

exports.findRecipient = async (id, type, schema) => {
  const result = await queryOne(attendeesQueries.findRecipient(id, type));
  return await attachReferences(result, schema);
};

/**
 * Default transactions
 * @public
 */

exports.findById = findById;
