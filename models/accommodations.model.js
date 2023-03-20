/*!
 * Accommodations model
 * File: accommodations.model.js
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
    modelName: 'accommodations',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        type: {
            dataType: 'varchar',
            required: true
        },
        short_name: {
            dataType: 'varchar',
            required: true
        },
        name: {
            dataType: 'varchar',
            required: true
        },
        description: {
            dataType: 'text',
            required: true
        }
    }
};

module.exports = db.generate(schema);