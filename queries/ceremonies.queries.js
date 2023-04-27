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
    update: (data, schema) => {

        if (!schema.modelName) return null;

        // timestamp fields
        const timestamps = ['updated_at'];

        // filter ignored columns:
        const ignore = ['id', 'created_at'];
        const cols = Object.keys(schema.attributes).filter(key => !ignore.includes(key));

        // generate prepared statement value placeholders
        // - NOTE: index shift to account for ID and created datetime values
        let index = 2;
        const assignments = cols.map(attr => {
            // handle timestamp placeholder defined in arguments
            const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

            // map returns conjoined prepared parameters in order
            return [`"${attr}"`, `${placeholder}::${schema.attributes[attr].dataType}`].join('=');
        });

        let sql = `        UPDATE ceremonies
                           SET ${assignments.join(',')}
                           WHERE id = $1::${schema.attributes.id.dataType}
                           RETURNING *;`;

        // position ID, creation datetime values at front of array
        let filteredData = [data.id];

        // filter input data to match update parameters
        filteredData.push(...Object.keys(schema.attributes)
            .filter(key => !ignore.includes(key) && !timestamps.includes(key))
            .map(key => {
                return data[key]
            }));

        // DEBUG SQL
        // console.log('UPDATE:', {sql: sql, data: filteredData})

        // apply update query
        return {sql: sql, data: filteredData};
    },
}
exports.queries = ceremoniesQueries;

exports.insert = async (data) => {
    return await transactionOne([ceremoniesQueries.insert(data)]);
}
exports.update = async (data, schema) => {
    return await transactionOne([ceremoniesQueries.update(data, schema)]);
}
/**
 * Default transactions
 * @public
 */

exports.findById = findById;