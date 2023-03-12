/*!
 * Communities model
 * File: communities.model.js
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
    modelName: 'communities',
    attributes: {
        name: {
            dataType: 'varchar',
            required: true
        },
        region: {
            dataType: 'varchar'
        }
    }
};

module.exports = db.generate(schema);