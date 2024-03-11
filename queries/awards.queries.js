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
      filterClauses.push("(quantity < 0 OR quantity > selected)");
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
