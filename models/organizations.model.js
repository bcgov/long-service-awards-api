/*!
 * Organizations model
 * File: organizations.model.js
 * Copyright(c) 2023 BC Gov
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
    modelName: 'organizations',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        abbreviation: {
            dataType: 'varchar',
            required: true
        },
        name: {
            dataType: 'varchar',
            required: true
        },
        previous_service_pins: {
            dataType: 'boolean'
        }
    }
};

module.exports = db.generate(schema);
