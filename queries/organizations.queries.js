/*!
 * Organizations SQL queries
 * File: organizations.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const {query} = require("../db");

/**
 * Organizations custom queries
 * - findall (filtered by IDs)
 * */

const organizationsQueries = {
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
        const {orderby = null, order = 'ASC', offset = 0, limit = null, organizations=[]} = filter || {};
        // (optional) order by attribute
        const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
        const limitClause = limit ? `LIMIT ${limit}` : '';

        // get ID filter
        const filterIDs = organizations.map((org, index) => `$${++index}::integer`).join(',')

        return {
            sql: `SELECT * FROM organizations 
                  ${organizations.length > 0 ? 'WHERE id IN (' + filterIDs + ')' : ''}
                  ${orderClause}
                  ${limitClause}
                  OFFSET ${offset};`,
            data: organizations,
        };

    },
}
exports.queries = organizationsQueries;

/**
 * Generate query: Find filtered results
 *
 * @param {Object} data
 * @parem {Object} user
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter, schema) => {
    return await query(organizationsQueries.findAll(filter, schema));
}
