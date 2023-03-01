/*!
 * Index SQL queries
 * File: index.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

const defaults = require('./default.queries.js');
const awards = require('./awards.queries.js');
const users = require('./users.queries.js');
const recipients = require('./recipients.queries.js');

/**
 * Index of query module exports.
 * @public
 */

module.exports = {
    defaults: defaults,
    users: users,
    recipients: recipients,
    awards: awards,
    generate: (schema) => {
        return {
            schema: schema,
            findAll: async(orderby=null, order='ASC', offset=0, limit=null) => {
                return await defaults.findAll( orderby, order, limit, offset, schema)
            },
            findById: async(id) => { return await defaults.findById(id, schema) },
            findByField: async(field, value) => { return await defaults.findByField(field, value, schema) },
            findOneByField: async(field, value) => { return await defaults.findOneByField(field, value, schema) },
            create: async(data) => { return await defaults.insert(data, schema) },
            update: async(data) => { return await defaults.update(data, schema) },
            save: async(data) => { return await defaults.upsert(data, schema) },
            remove: async(id) => {
                return await db.defaults.removeByFields( ['id'], [id], schema)
            },
            removeAll: async() => { return await defaults.removeAll(schema) }
        }
    }
};
