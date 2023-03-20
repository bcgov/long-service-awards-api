/*!
 * User Permissions model
 * File: user-permissions.model.js
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
    modelName: 'user_permissions',
    attributes: {
        name: {
            dataType: 'varchar',
            required: true
        },
        label: {
            dataType: 'varchar',
            required: true
        }
    }
};

module.exports = db.generate(schema);
