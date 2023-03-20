/*!
 * Organizations model
 * File: organizations.model.js
 * Copyright(c) 2023 BC Gov
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

/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @param {Function} attach attachment method
 * @return {Object} model instance
 * @public
 */

const construct = (init, attach=null) => {
    return ModelConstructor({
        init: init,
        schema: schema,
        db: db.defaults,
        attach: attach
    });
}

module.exports = {
    schema: schema,
    create: construct,
    findById: async(id) => {
        return construct(await db.defaults.findById(id, schema));
    },
    findAll: async(filter={}, user=null) => {
        // restrict available orgs for organizational (ministry) contacts
        const {organizations} = user || {};
        filter.organizations = (organizations || []).map(({organization}) => organization.id);
        return await db.organizations.findAll({...filter || {}, ...{orderby: 'name', order: 'ASC'}}, schema);
    },
    remove: async(id) => {
        await db.defaults.removeByFields(['id'], [id], schema);
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema);
    }
}
