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
            dataType: 'uuid'
        },
        user: {
            dataType: 'uuid'
        },
        code: {
            dataType: 'varchar',
            required: true
        },
        error: {
            dataType: 'boolean'
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
        }
    }
};

module.exports = db.generate(schema);