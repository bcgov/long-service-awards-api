/*!
 * Award Options model
 * File: award-options.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const defaults = require("../queries/default.queries");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'award_options',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        award: {
            dataType: 'integer',
            required: true
        },
        type: {
            dataType: 'varchar',
            required: true
        },
        name: {
            dataType: 'varchar',
            required: true
        },
        value: {
            dataType: 'varchar',
            required: true
        },
        label: {
            dataType: 'varchar',
            required: true
        },
        description: {
            dataType: 'text'
        },
        customizable: {
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

module.exports =  {
    schema: schema,
    create: construct,
    attach: async(awardOptions, award) => {

        /**
         * Attach award options to award
         * @public
         */

        // set reference values
        awardOptions.award = award.id;
        // upsert record
        return await defaults.upsert(awardOptions.data, awardOptions.schema);
    },
    findAll: async(offset=0, order='asc') => {
        return await db.defaults.findAll( schema, offset, order);
    },
    findByAward: async(awardID) => {
        const awardOptions = await db.defaults.findByField('award', awardID, schema);
        return (awardOptions || []).map(awardOption => {
            return construct(awardOption)
        });
    },
    findById: async(id) => {
        return await db.defaults.findById(id, schema);
    },
    remove: async() => {

    }
}
