/*!
 * Awards SQL queries
 * File: awards.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const {query} = require("../db");


/**
 * Generate query: Find all options for award.
 *
 * @return {Promise} results
 * @public
 */

exports.findOptions = async (id) => {
    return query({
        sql: `SELECT * 
                FROM awards
                WHERE 'award' = ${id};`,
        data: [id],
    });
}

