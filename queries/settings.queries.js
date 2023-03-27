/*!
 * Global Settings SQL queries
 * File: settings.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {queryOne} = require("../db");

/**
 * Generate query: Upsert record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.upsert = async (data) => {

    const {
        name=null,
        value=null,
        label=null
    } = data || {};

    return await queryOne({
        sql: `INSERT INTO settings ("name", label, value)
                VALUES ($1::varchar, $2::varchar, $3::varchar)
                ON CONFLICT ("name") DO UPDATE SET label=$2::varchar, value=$3::varchar 
                RETURNING *;
        `,
        data: [name, label, value],
    });
}