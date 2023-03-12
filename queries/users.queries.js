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

/**
 * Generate query: Find roles for user by ID value.
 *
 * @param {String} id
 * @return {Promise} results
 * @public
 */

const findRoles = async (id) => {
    const result = await query({
        sql: `
            SELECT name, label FROM user_roles_selections
                                        JOIN user_roles ON user_roles.name = user_roles_selections.role
            WHERE "user"=$1::uuid;`,
        data: [id],
    });
    return (result || []).map(item => {
        const {name=null} = item || {};
        return name
    });
};
exports.findRoles = findRoles;

/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findById = async (id) => {
    const user = await queryOne({
        sql: `SELECT id, guid, idir, first_name, last_name, email FROM users WHERE id = $1::uuid;`,
        data: [id],
    });
    // include user roles
    if (user) user.roles = await findRoles(id);
    return user;
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
        sql: `SELECT id, guid, idir, first_name, last_name, email, password
              FROM users
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });
    // include user roles
    await Promise.all(
        users.map( async (user) => {
            user.roles = await findRoles(user.id);
        })
    );
    return users;
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
        sql: `SELECT id, guid, idir, first_name, last_name, email, password
              FROM users
              WHERE ${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });

    // include user roles
    if (user) user.roles = await findRoles(user.id);
    return user;
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
        roles=[]
    } = data || {};

    // encrypt password for admin users
    const encryptedPassword = password ? await bcrypt.hash(password, 5) : null;

    // create user record
    let queries = [{
        sql: `
            INSERT INTO users (id, guid, idir, first_name, last_name, email, password)
            VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar);
        `,
        data: [id, guid, idir, first_name, last_name, email, encryptedPassword],
    }];

    // set roles for user
    queries.push.apply(queries, roles.map(role => {
        return {
            sql: `INSERT INTO user_roles_selections ("user", role) VALUES ($1::uuid, $2::varchar);`,
            data: [id, role],
        };
    }));

    return await transaction(queries);
}

/**
 * Generate query: Update record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.update = async (data) => {

    const {
        id=null,
        first_name=null,
        last_name=null,
        email=null,
        roles=[]
    } = data || {};

    // update user record
    let queries = [{
        sql: `
            UPDATE users
            SET first_name=$2::varchar, last_name=$3::varchar, email=$4::varchar
            WHERE id = $1::uuid
                RETURNING *;
        `,
        data: [id, first_name, last_name, email],
    }];

    // set roles for user
    queries = roles.reduce((o, role) => {
        o.push({
            sql: `DELETE FROM user_roles_selections WHERE "user" = $1::uuid;`,
            data: [id],
        });
        o.push({
            sql: `INSERT INTO user_roles_selections ("user", role) VALUES ($1::uuid, $2::varchar);`,
            data: [id, role],
        });
        return o;
    }, queries);

    return await transaction(queries);
}