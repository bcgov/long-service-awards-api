/*!
 * Users SQL queries
 * File: users.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {query, queryOne, transaction} = require("../db");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const {attachReferences} = require("./default.queries");

/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findById = async (id, schema) => {
    const user = await queryOne({
        sql: `SELECT id, guid, role, idir, first_name, last_name, email FROM users WHERE id = $1::uuid;`,
        data: [id],
    });
    return await attachReferences(user, schema);
};

/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findAuthByField = async (field, value, schema) => {
    const users = await query({
        sql: `SELECT id, guid, role, idir, first_name, last_name, email, password
              FROM users
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });
    // attach linked records to results
    return await Promise.all((users || []).map(async(user) => {
        return await attachReferences(user, schema);
    }));
};

/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findOneByField = async (field, value, schema) => {
    const user = await queryOne({
        sql: `SELECT id, guid, role, idir, first_name, last_name, email, password
              FROM users
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });

    return await attachReferences(user, schema);
};

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.insert = async (data) => {

    // generate UUID for user
    const id = uuid.v4();
    const {
        guid=null,
        idir=null,
        first_name=null,
        last_name=null,
        email=null,
        password=null,
        role
    } = data || {};

    // encrypt password for admin users
    const encryptedPassword = password ? await bcrypt.hash(password, 5) : null;

    // create user record
    let queries = [{
        sql: `
            INSERT INTO users (id, guid, role, idir, first_name, last_name, email, password)
            VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8::varchar);
        `,
        data: [id, guid, role, idir, first_name, last_name, email, encryptedPassword],
    }];

    return await transaction(queries);
}

/**
 * Generate query: Update record in table.
 * - clear out the user roles and organizations to reset attached
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.update = async (data) => {

    const {id, first_name, last_name, email, role} = data || {};

    // update user record
    let queries = [{
            sql: `
                UPDATE users
                SET first_name=$2::varchar, last_name=$3::varchar, email=$4::varchar, role=$5::varchar
                WHERE id = $1::uuid
                RETURNING *;
            `,
            data: [id, first_name, last_name, email, role],
        }
    ];
    return await transaction(queries);
}

/**
 * Generate query: Reset user password
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.resetPassword = async (data) => {

    const {id, password} = data || {};

    // update user record
    let queries = [{
        sql: `
                UPDATE users
                SET password=$2::varchar
                WHERE id = $1::uuid
                RETURNING *;
            `,
        data: [id, password],
    }
    ];
    return await transaction(queries);
}