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

const ceremoniesQueries = {
  // insert: (data) => {
  //   const { id = null } = data || {};
  //   return {
  //     sql: `INSERT INTO ceremonies (
  //               id, venue, datetime, created_at, updated_at, active
  //               ) VALUES (
  //                   $1::uuid,
  //                   '',
  //                   NOW(),
  //                   NOW(),
  //                   NOW(),
  //                   true
  //               )
  //           `,
  //     data: [id],
  //   };
  // },
  insert: (data) => {
    const { id = null, venue = null } = data || {};
    return {
      sql: `INSERT INTO ceremonies (
                id, venue, datetime, created_at, updated_at, active
                ) VALUES (
                    $1::uuid,
                    $2::varchar,
                    NOW(),
                    NOW(),
                    NOW(),
                    true
                )
                RETURNING *;`,
      data: [id, venue],
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

    let sql = `        UPDATE ceremonies
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
  _report: (cycle) => {
    const queryFilter = cycle
      ? `WHERE ceremonies.datetime >= '${cycle}-01-01' AND ceremonies.datetime <= '${cycle}-12-31' AND guest = 0`
      : `WHERE guest = 0`;
    let sql = `SELECT  to_char(ceremonies.datetime, 'Mon DD, YYYY @ HH12:MI AM') AS "ceremony_date_time", count(*) as "recipient_count" FROM public.attendees LEFT JOIN ceremonies ON attendees.ceremony = ceremonies.id ${queryFilter} GROUP BY ceremony, ceremonies.datetime ORDER BY ceremonies.datetime ASC;`;
    return { sql: sql, data: [] };
  },

  report: (cycle) => {
    
    const sql = `
      WITH award_data AS (
        SELECT
        
          DATE(ceremonies.datetime) AS night,
          CONCAT(service_selections.milestone, ' - ', awards.label) AS award_name,
          CASE
            WHEN award_options.type = 'pecsf-charity'
            THEN 'Donation'
            ELSE
              CASE
                WHEN award_option_selections.custom_value IS null
                THEN ''
                ELSE CONCAT(award_options.label, ' | ', award_options.description)
              END
          END
          AS custom_description
          
          FROM attendees
          LEFT JOIN recipients
            ON recipients.id = attendees.recipient
          LEFT JOIN service_selections
            ON service_selections.recipient = attendees.recipient
          LEFT JOIN award_selections
            ON award_selections.id = service_selections.id
          LEFT JOIN awards
            ON awards.id = award_selections.award
          LEFT JOIN award_option_selections
            ON award_option_selections.service = service_selections.id
          LEFT JOIN award_options
            ON award_options.id = award_option_selections.award_option
          INNER JOIN ceremonies
            ON ceremonies.id = attendees.ceremony
            AND datetime >= $1::timestamp
            AND datetime <= $2::timestamp
          WHERE service_selections.cycle = $3::integer
            AND attendees.guest = 0
            AND attendees.ceremony IN (
                SELECT id
                FROM ceremonies
            )
            AND award_selections.award IS NOT NULL
          )

          SELECT
            *,
            COUNT(*) AS award_count
            FROM award_data
          GROUP BY award_name, custom_description, night
          ORDER BY night, award_name      
    `;

    return { sql: sql, data: [`'${cycle}-01-01'`, `'${cycle}-12-31'`, cycle-1] };
  },
  
  reportV2: (cycle) => {
    
    const sql = `
      WITH award_data AS (
        SELECT
            attendees.recipient,
		      	attendees.ceremony,
            recipients.id AS recipient_id,
            awards.short_code,
            award_option_selections.custom_value,
            CONCAT(
                awards.short_code,
                CASE
                    WHEN award_option_selections.custom_value IS NOT NULL
                    THEN CONCAT(' [', award_option_selections.custom_value, ']')
                    ELSE ''
                END
            ) AS award,
            ceremonies.datetime
        FROM attendees
        LEFT JOIN recipients
            ON recipients.id = attendees.recipient
        LEFT JOIN service_selections
            ON service_selections.recipient = attendees.recipient
        LEFT JOIN award_selections
            ON award_selections.id = service_selections.id
        LEFT JOIN awards
            ON awards.id = award_selections.award
        LEFT JOIN award_option_selections
            ON award_option_selections.service = service_selections.id
        INNER JOIN ceremonies
            ON ceremonies.id = attendees.ceremony
            AND datetime >= $1::timestamp
            AND datetime <= $2::timestamp
        WHERE service_selections.cycle = $3::integer
            AND attendees.guest = 0
            AND attendees.ceremony IN (
                SELECT id
                FROM ceremonies
            )
            AND award_selections.award IS NOT NULL
      )

      SELECT
          datetime AS ceremony_date,
          STRING_AGG(award_data.award, '; ' ORDER BY award) AS awards_per_ceremony
      FROM award_data
      GROUP BY datetime
      ORDER BY datetime
    `;

    return { sql: sql, data: [`'${cycle}-01-01'`, `'${cycle}-12-31'`, cycle] };
  }
};
exports.queries = ceremoniesQueries;

exports.insert = async (data) => {
  data.id = uuid.v4();
  return await transactionOne([ceremoniesQueries.insert(data)]);
};
exports.update = async (data, schema) => {
  return await transactionOne([ceremoniesQueries.update(data, schema)]);
};
exports.report = async (cycle) => {
  return await query(ceremoniesQueries.report(cycle));
};
exports.reportV2 = async (cycle) => {
  return await query(ceremoniesQueries.reportV2(cycle));
};
/**
 * Default transactions
 * @public
 */

exports.findById = findById;
