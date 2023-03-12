/*!
 * Attendees model
 * File: attendees.model.js
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
    modelName: 'attendees',
    attributes: {
        id: {
            dataType: 'uuid',
            required: true
        },
        recipient: {
            dataType: 'integer',
            required: true
        },
        ceremony: {
            dataType: 'integer'
        },
        status: {
            dataType: 'varchar'
        },
        guest: {
            dataType: 'boolean'
        },
        created_at: {
            dataType: 'timestamp'
        },
        updated_at: {
            dataType: 'timestamp'
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
    findAll: async(filter) => {return await db.defaults.findAll(filter, schema)},
    findById: async(id) => { await db.defaults.findById(id, schema) },
    findByCeremony: async(ceremony_id) => { await db.defaults.findByField('ceremony', ceremony_id, schema) },
    create: async(data) => { await db.defaults.insert(data, schema) },
    update: async(data) => { await db.defaults.update(data, schema) },
    remove: async(id) => { await db.defaults.remove(id, schema) },
    removeAll: async() => { await db.defaults.removeAll(schema) }
}
