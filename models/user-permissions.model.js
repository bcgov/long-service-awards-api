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

module.exports =  {
    findAll: async(offset=0, order='asc') => { await db.defaults.findAll( schema, offset, order) },
    findById: async(id) => { await db.defaults.findById(id, schema) },
    create: async(data) => { await db.defaults.insert(data, schema) },
    update: async(data) => { await db.defaults.update(data, schema) },
    remove: async(id) => { await db.defaults.remove(id, schema) },
    removeAll: async() => { await db.defaults.removeAll(schema) }
}
