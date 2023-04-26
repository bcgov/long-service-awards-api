/*!
 * Recipients SQL queries
 * File: recipients.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const {transactionOne, query, queryOne} = require("../db");
const uuid = require("uuid");
const {findById, queries, attachReferences } = require("./default.queries");
const defaults = require("./default.queries");

const ceremoniesQueries = {
    insert: (data)=>{
        const {
            id=null
        } = data || {};
        return {
            sql: `INSERT INTO ceremonies (
                id, venue, datetime, created_at, updated_at, active
                ) VALUES (
                    $1::uuid,
                    '',
                    NOW(),
                    NOW(),
                    NOW(),
                    true
                )
            `,
            data: [id]
        };
    },
}
exports.queries = ceremoniesQueries;

exports.insert = async (data) => {
    // generate UUID for recipient
    data.id = uuid.v4();
    return await transactionOne([ceremoniesQueries.insert(data)]);
}