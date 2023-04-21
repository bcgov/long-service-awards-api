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
                orderby = null,
                order = 'ASC',
                offset = 0,
                limit = null,
                active=true
            } = filter || {};

        // (optional) order by attribute
        const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
        const limitClause = limit ? `LIMIT ${limit}` : '';

        // build filter clause array
        const filterClauses = [];
        if (active) {
            filterClauses.push('active = true');
            // include check for quantities
            filterClauses.push('quantity != 0');
        }

        // return {
        //     sql: `SELECT * FROM awards
        //         ${filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : ''}
        //         ${orderClause}
        //         ${limitClause}
        //           OFFSET ${offset};`,
        //     data: [],
        // };

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
            ;`,
                data: []
        }

    },
    findByFields: (fields, values, schema, sort) => {

        // (optional) order by attribute
        const {orderby, order} = sort || {};
        const orderClause = order && orderby ? `ORDER BY ${orderby} ${order || 'ASC'}` : '';

        // build filter clause array
        if (fields.includes('active')) {
            filterClauses.push('active = true');
            // include check for quantities
            filterClauses.push('quantity != 0');
        }

        // construct where condition sql
        const filterClauses = (fields || [])
            .map((field, index) => {
            return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
        });

        return {
            sql: `SELECT *
                  FROM ${schema.modelName} 
                      ${filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : ''} 
                  ${orderClause};`,
            data: values,
        };
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
    return await query(awardsQueries.findAll(filter));
}
