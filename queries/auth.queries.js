/*!
 * Default SQL queries
 * File: auth.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {query, queryOne} = require("../db");

/**
 * Database rows limit.
 */

const limit = 50;

/**
 * Generate query: Find all records in table.
 *
 * @param schema
 * @param {int} offset
 * @param {String} order
 * @return {Promise} results
 * @public
 */

exports.findAll = async (schema, offset = 0, order='') => {
    // (optional) order by attribute
    const orderby = order ? `ORDER BY ${order}` : '';
    return query({
        sql: `SELECT * 
                FROM ${schema.modelName} 
                ${orderby}
                LIMIT ${limit} 
                OFFSET ${offset};`,
        data: [],
    });
}

/**
 * Generate query: Find record by ID.
 *
 * @param id
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findById = async (id, schema) => {
    await query({
        sql: `SELECT * 
            FROM ${schema.modelName} 
            WHERE 'id' = $1::integer
            LIMIT 1;`,
        data: [id],
    });
}


/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findByField = async (field, value, schema) => {
    return await query({
        sql: `SELECT *
              FROM ${schema.modelName}
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });
};

/**
 * Generate query: Find single record by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findOneByField = async (field, value, schema) => {
    return await queryOne({
        sql: `SELECT *
              FROM ${schema.modelName}
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });
};

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @param {Object} schema
 * @param {Boolean} upsert
 * @return {Promise} results
 * @public
 */

exports.insert = async(data, schema, upsert=false) => {

    const timestamps = ['created_at', 'updated_at'];
    const ignore = ['id'];

    // return null if instance is null
    if (!schema.modelName) return null;

    // filter ignored columns
    // - do not ignore if model is for a node or file
    const cols = Object.keys(data).filter(key => ignore.includes(key));

    // generate prepared sql
    let index = 1;
    const vals = cols.map(key => {
        const placeholder = timestamps.includes(key) ? `NOW()` : `$${index++}`;
        return `${placeholder}::${schema.attributes[key].type}`;
    });

    // upsert assignment values
    index = 1;
    const upsertCols = cols.filter(key => !timestamps.includes(key));
    const assignments = cols
        .filter(key => !ignore.includes(key))
        .map(attr => {
            // handle timestamp placeholders defined in arguments
            const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;
            // map returns conjoined prepared parameters in order
            return [attr, `${placeholder}::${schema.attributes[attr].type}`].join('=');
        });

    // construct prepared statement (insertion or merge)
    let sql = upsert
        ? `INSERT INTO ${schema.modelName} (${cols.join(',')})
            VALUES (${vals.join(',')})
            ON CONFLICT (${upsertCols.join(',')})
            DO UPDATE SET ${assignments.join(',')}
            RETURNING *;`
        : `INSERT INTO ${schema.modelName} (${cols.join(',')})
            VALUES (${vals.join(',')})
            RETURNING *;`

    // filter input data to match insert parameters
    // filters: ignored, timestamp, ID attributes
    let filteredData = Object.keys(schema.attributes)
        .filter(key => !ignore.includes(key) && !timestamps.includes(key))
        .map(key => {
            return data && data.hasOwnProperty('key') ? data[key] : null
        });

    // collate data as value array
    await query({
        sql: sql,
        data: [filteredData],
    });

}

/**
 * Generate query: Update record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.update = async(data, schema) => {

    // return null if instance is null
    if (!schema.modelName) return null;

    // timestamp fields
    const timestamps = ['updated_at'];

    // filter ignored columns:
    // - DO NOT ignore ID, CREATE_AT columns if model is a node instance
    const ignore = ['id', 'created_at'];
    const cols = Object.keys(schema.attributes).filter(key => !ignore.includes(key));

    // generate prepared statement value placeholders
    // - NOTE: index shift to account for ID and created datetime values
    let index = 2;
    const assignments = cols.map(attr => {
        // handle timestamp placeholder defined in arguments
        const placeholder = timestamps.includes(attr)
            ? `NOW()`
            : `$${index++}`;

        // map returns conjoined prepared parameters in order
        return [attr, `${placeholder}::${schema.attributes[attr].type}`].join('=');
    });

    let sql = `UPDATE "${schema.modelName}" 
                SET ${assignments.join(',')} 
                WHERE id = $1::integer
                RETURNING *;`;

    // position ID, creation datetime values at front of array
    let filteredData = [data.id];

    // filter input data to match update parameters
    data.push(...Object.keys(schema.attributes)
        .filter(key => !ignore.includes(key) && !timestamps.includes(key))
        .map(key => {return data[key]}));

    // collate data as value array
    await query({
        sql: sql,
        data: [filteredData],
    });
}

/**
 * Generate query: Delete record from table.
 *
 * @param {int} id
 * @param schema
 * @return {Promise} results
 * @public
 */

exports.remove = async(id, schema) => {
    await query({
        sql: `DELETE FROM ${schema.modelName}
              WHERE id = $1::integer
            RETURNING *;`,
        data: [id],
    });
}

/**
 * Generate query: Delete all records from table.
 *
 * @param schema
 * @return {Promise} results
 * @public
 */

exports.removeAll = async(schema) => {
    await query({
        sql: `DELETE FROM ${schema.modelName} RETURNING *;`,
        data: [],
    });
}
