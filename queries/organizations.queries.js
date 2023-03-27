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
        const {
                orderby = null,
                order = 'ASC',
                offset = 0,
                limit = null,
                organizations,
                active
            } = filter || {};
        // (optional) order by attribute
        const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
        const limitClause = limit ? `LIMIT ${limit}` : '';

        // build filter clause array
        const filterClauses = [];
        // include organizations filter
        if (organizations) {
            const filterIDs = organizations.map((org, index) => `$${++index}::integer`).join(',');
            if (organizations.length > 0) filterClauses.push('id IN (' + filterIDs + ')');
        }
        // include active (organizaton is active) filter
        if (active) filterClauses.push('active = true');

        return {
            sql: `SELECT * FROM organizations 
                ${filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : ''}
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
