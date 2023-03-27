/*!
 * Milestones model
 * File: milestones.model.js
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
    modelName: 'milestones',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        year: {
            dataType: 'integer',
            required: true
        },
        label: {
            dataType: 'varchar',
            required: true
        },
        active: {
            dataType: 'boolean'
        }
    }
};

module.exports = db.generate(schema);