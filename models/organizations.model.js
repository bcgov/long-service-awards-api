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
            dataType: 'integer'
        },
        abbreviation: {
            dataType: 'varchar'
        },
        name: {
            dataType: 'varchar'
        },
        created_at: {
            dataType: 'timestamp'
        },
        updated_at: {
            dataType: 'timestamp'
        }
    }
};

module.exports = db.generate(schema);
