/*!
 * User Role model
 * File: user-roles.model.js
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
    modelName: 'user_roles',
    attributes: {
        name: {
            dataType: 'varchar',
            primary: true,
            required: true
        },
        label: {
            dataType: 'varchar',
            required: true
        }
    }
};


/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @param attach
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

module.exports =  {
    schema: schema,
    create: construct,
    findAll: async(filter) => {
        return await db.defaults.findAll(filter, schema)
    },
    findById: async(name) => {
        return await db.defaults.findOneByField('name', name, schema)
    }
}