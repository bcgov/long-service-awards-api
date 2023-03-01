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
            dataType: 'integer'
        },
        year: {
            dataType: 'integer'
        },
        label: {
            dataType: 'varchar'
        }
    }
};

module.exports = db.generate(schema);