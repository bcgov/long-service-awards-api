/*!
 * Qualifying Years model
 * File: qualifying-years.model.js
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
    modelName: 'qualifying_years',
    attributes: {
        name: {
            dataType: 'integer',
            required: true
        },
        current: {
            dataType: 'boolean'
        }
    }
};

module.exports = {
    schema: schema,
    findAll: async () => {
        return await db.defaults.findAll({orderby: 'name', order: 'DESC'}, schema);
    },
    findCurrent: async () => {
        return await db.defaults.findOneByField('current', true, schema);
    },
}
