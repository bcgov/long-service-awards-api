/*!
 * Transaction model
 * File: transaction.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'transactions',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        recipient: {
            dataType: 'integer'
        },
        user: {
            dataType: 'uuid'
        },
        error: {
            dataType: 'boolean'
        },
        code: {
            dataType: 'varchar',
            required: true
        },
        description: {
            dataType: 'varchar',
            required: true
        },
        details: {
            dataType: 'text',
            required: true
        },
        created_at: {
            dataType: 'timestamp'
        },
        updated_at: {
            dataType: 'timestamp'
        }
    },
    attachments: {
        code: {
            model: 'transaction_codes'
        },
    }
};

module.exports =  {
    schema: schema,
    findAll: async(offset=0, order='asc') => { await db.defaults.findAll( schema, offset, order ) },
    findById: async(id) => { await db.defaults.findById(id, schema) },
    create: async(data) => { await db.defaults.insert(data, schema) },
    remove: async(id) => { await db.defaults.remove(id, schema) },
    removeAll: async() => { await db.defaults.removeAll(schema) }
}
