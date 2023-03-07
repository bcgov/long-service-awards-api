/*!
 * Award Selections model
 * File: award-selections.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const defaults = require("../queries/default.queries");
const Award = require("../models/awards.model.js");
const AwardOptionSelection = require("../models/award-option-selections.model.js");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'award_selections',
    attributes: {
        id: {
            dataType: 'uuid',
            required: true
        },
        award: {
            dataType: 'integer',
            required: true,
            model: Award
        }
    },
    attachments: {
        selections: {
            model: [AwardOptionSelection],
            get: AwardOptionSelection.findByService,
            attach: AwardOptionSelection.attach
        },
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
    attach: async (awardSelection, serviceSelection) => {

        /**
         * Attach award selection to service selection
         * @public
         */

        // set reference values
        awardSelection.id = serviceSelection.id;
        // upsert if award selected
        if (awardSelection.award) {
            // destructure award and upsert record
            const { award } = awardSelection.data;
            return await defaults.upsert({ id: awardSelection.id, award: award.id }, schema);
        }
    },
    findAll: async(offset=0, order='asc') => {
        return await db.defaults.findAll( schema, offset, order);
    },
    findById: async(id) => {
        return construct(await db.defaults.findById(id, schema));
    },
    remove: async(id) => {
        await db.defaults.removeByFields(['id'], [id], schema);
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema);
    }
}
