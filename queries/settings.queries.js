/*!
 * Global Settings SQL queries
 * File: settings.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {queryOne, transaction} = require("../db");

// LSA-519 Update qualifying years when global cycle changes
const updateQualifyingYears = async (year) => {

    const queries = [
        {
            sql: `UPDATE qualifying_years SET current = FALSE;`,
            data: []
        },
        {
            sql: `INSERT INTO qualifying_years ("name", current) 
                VALUES ($1::integer, TRUE)
                ON CONFLICT ("name") DO UPDATE SET current = TRUE
                RETURNING *;
            `,
            data: [year]
        }
    ];

    return await transaction(queries);
};

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

    // LSA-519 Update qualifying years when global cycle changes
    if ( name == "cycle" ) {

        await updateQualifyingYears(value);
    }

    return await queryOne({
        sql: `INSERT INTO settings ("name", label, value)
                VALUES ($1::varchar, $2::varchar, $3::varchar)
                ON CONFLICT ("name") DO UPDATE SET label=$2::varchar, value=$3::varchar 
                RETURNING *;
        `,
        data: [name, label, value],
    });
}