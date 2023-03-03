/*!
 * Award Selections model
 * File: award-selections.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const defaults = require("../queries/default.queries");
const AwardOption = require("./award-options.model");
const PecsfCharity = require("../models/pecsf-charities.model.js");
const {isEmpty} = require("../services/validation.services");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'award_option_selections',
    attributes: {
        service: {
            dataType: 'uuid'
        },
        award_option: {
            dataType: 'integer',
            model: AwardOption
        },
        custom_value: {
            dataType: 'varchar'
        },
        pecsf_charity: {
            dataType: 'integer',
            model: PecsfCharity
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
    attach: async(awardOption, awardSelection) => {

        /**
         * Attach award option to award selection
         * @public
         */

        // set reference values
        // - overwrite award option object with ID value
        // - destructure award and upsert record
        const awardOptionData = {
            service: awardSelection.id,
            award_option: awardOption.award_option,
            custom_value: awardOption.custom_value,
            pecsf_charity: awardOption.pecsf_charity
        }
        // detach existing award options
        await defaults.removeByFields(['service'], [awardOption.service], schema);
        // upsert new options
        return await defaults.upsert(awardOptionData, awardOption.schema, ['award_option', 'service']);

    },
    findByService: async(serviceID) => {
        const awardOptionSelections = await db.defaults.findByField('service', serviceID, schema);
        return (awardOptionSelections || []).map(awardOptionSelection => {
            return construct(awardOptionSelection)
        });
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
