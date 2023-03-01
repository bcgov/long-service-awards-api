/*!
 * Accommodations model
 * File: accommodations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");

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
            dataType: 'integer'
        },
        type: {
            dataType: 'varchar'
        },
        short_name: {
            dataType: 'varchar'
        },
        name: {
            dataType: 'varchar'
        },
        description: {
            dataType: 'text'
        }
    }
};

/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @param {Function} attach attachment method
 * @return {Object} model instance
 * @public
 */

const construct = (init, attach) => {
    return ModelConstructor({
        init: init,
        schema: schema,
        db: db.defaults,
        attach: attach
    });
}

module.exports =  {
    schema: schema,
    findAll: async(offset=0, order='asc') => { await db.defaults.findAll( schema, offset, order ) },
    findById: async(id) => { await db.defaults.findById(id, schema) },
    findByAttendee: async(id) => { await db.defaults.findByField('attendee', id, schema) },
    create: async(data) => { await db.defaults.insert(data, schema) },
    update: async(data) => { await db.defaults.update(data, schema) },
    remove: async(id) => { await db.defaults.remove(id, schema) },
    removeAll: async() => { await db.defaults.removeAll(schema) }
}
