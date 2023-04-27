/*!
 * Awards SQL queries
 * File: awards.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const {query} = require("../db");


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
        const {
                active=true,
                milestone = null,
            } = filter || {};

        // (optional) order by attribute
        // const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
        // const limitClause = limit ? `LIMIT ${limit}` : '';

        // build filter clause array
        const filterClauses = [];
        if (active) {
            filterClauses.push('active = true');
            // quantity filter
            filterClauses.push('(quantity < 0 OR quantity > selected)');
        }
        // milestone filter
        if (milestone) {
            filterClauses.push('milestone = $1::integer');
        }


        return {
            sql: `
            SELECT * 
            FROM awards AS "awds"
                    -- award options details
                     LEFT JOIN (
                      SELECT awdopts.award as opts_award_id,
                             JSON_AGG( json_build_object(
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
                    GROUP BY awdsel.award
                ) AS "selections" ON select_award_id = "awds"."id"  
                ${filterClauses.length > 0 ? 'WHERE ' + filterClauses.join(' AND ') : ''}
            ;`,
                data: milestone ? [milestone] : []
        }

    },

}
exports.queries = awardsQueries;

/**
 * Generate query: Find filtered results
 *
 * @param {Object} filter
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter) => {
    console.log(awardsQueries.findAll(filter))
    return await query(awardsQueries.findAll(filter));
}

