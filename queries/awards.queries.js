/*!
 * Awards SQL queries
 * File: awards.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { query } = require("../db");

/**
 * Awards custom queries
 * - findall (filtered by active)
 * */

const awardsQueries = {
  findAll: (filter) => {
    /**
     * Generate query: Find all filtered records in table.
     *
     * @param schema
     * @param {int} offset
     * @param {String} order
     * @return {Promise} results
     * @public
     */

    // destructure filter for sort/order/offset/limit
    const { active = true, milestone = null } = filter || {};

    // get current year for query of awards selected in the current year
    const currentYear = new Date().getFullYear();

    // (optional) order by attribute
    // const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
    // const limitClause = limit ? `LIMIT ${limit}` : '';

    // build filter clause array
    const filterClauses = [];
    if (active) {
      filterClauses.push("active = true");
      // quantity filter
      filterClauses.push(
        "(quantity < 0 OR quantity > selected OR selected IS NULL)",
      );
    }
    // milestone filter
    if (milestone) {
      filterClauses.push("milestone = $1::integer");
    }
    return {
      sql: `
      WITH awd_cycle_filtered AS (SELECT service_selections.id as "service_id" FROM service_selections LEFT JOIN (SELECT * FROM award_selections) as "awdselects" on service_selections.id = awdselects.id WHERE service_selections.cycle = ${currentYear})

      SELECT awds.id, opts_award_id, select_award_id, awds.*, selections.selected, opts.options
            FROM awards AS "awds"
            -- award options details
            LEFT JOIN (
                SELECT awdopts.award as opts_award_id,
                       JSON_AGG(json_build_object(
                           'id', awdopts.id,
                           'award', awdopts.award,
                           'type', awdopts.type,
                           'name', awdopts.name,
                           'description', awdopts.description,
                           'label', awdopts.label,
                           'value', awdopts.value,
                           'customizable', awdopts.customizable
                       )) AS options
                FROM "award_options" AS "awdopts"
                GROUP BY opts_award_id
            ) AS "opts" ON opts_award_id = "awds"."id"
            -- recipient award selections
            LEFT JOIN (
                SELECT awdsel.award as select_award_id, COUNT(*) AS selected
                FROM "award_selections" AS "awdsel"
                WHERE awdsel.id in (select service_id FROM awd_cycle_filtered)
                GROUP BY awdsel.award
            ) AS "selections" ON select_award_id = "awds"."id"
                ${
                  filterClauses.length > 0
                    ? "WHERE " + filterClauses.join(" AND ")
                    : ""
                }
            ;`,
      data: milestone ? [milestone] : [],
    };
  },
  _report: (currentCycle) => {
    const cycle = currentCycle || new Date().getFullYear();
    return {
      sql: `(SELECT awards.label AS award_name, award_options AS option_name, awards.milestone, COUNT(award_option_selections.award_option) AS award_count from award_option_selections
            LEFT JOIN award_options ON award_option_selections.award_option = award_options.id
			      LEFT JOIN awards ON award_options.award = awards.id
            LEFT JOIN service_selections ON award_option_selections.service = service_selections.id
            WHERE service_selections.cycle = ${cycle}
            GROUP BY award_options.label, awards.id, option_name
            ORDER BY awards.milestone, award_name)
            UNION ALL 
            (SELECT awards.label AS award_name, NULL as option_name, awards.milestone, COUNT(award_selections.award) AS award_count from award_selections
            LEFT JOIN awards ON award_selections.award = awards.id
            LEFT JOIN service_selections ON award_selections.id = service_selections.id
            WHERE service_selections.cycle = ${cycle}
            GROUP BY awards.label, awards.id
            ORDER BY awards.milestone, award_name)
			      ORDER BY award_name, option_name DESC`,
      data: [],
    };
  },
  report: (cycle) => {
    
    const sql = `
      WITH award_data AS (
              SELECT
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
            AS custom_description,
            service_selections.milestone
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
          GROUP BY award_name, custom_description, milestone
          ORDER BY award_name, milestone
            
    `;

    return { sql: sql, data: [`'${cycle}-01-01'`, `'${cycle}-12-31'`, cycle] };
  },
};
exports.queries = awardsQueries;

/**
 * Generate query: Find filtered results
 *
 * @param {Object} filter
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter) => {
  return await query(awardsQueries.findAll(filter));
};

/**
 * Generate query: Find filtered results
 *
 * @param {Object} filter
 * @return {Promise} results
 * @public
 */

exports.report = async (cycleYear) => {
  return await query(awardsQueries.report(cycleYear));
};

