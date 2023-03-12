/*!
 * User-Organizations Selections model
 * File: user-organization-selections.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const defaults = require("../queries/default.queries");
const Organization = require("./organizations.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'user_organization_selections',
    attributes: {
        user: {
            dataType: 'uuid',
            required: true
        },
        organization: {
            dataType: 'integer',
            required: true,
            model: Organization
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
    attach: async(organization, user) => {

        /**
         * Attach organization to user
         * @public
         */

        // detach existing award options
        await defaults.removeByFields(['user'], [user.id], schema);
        // upsert new options
        return await defaults.upsert(organization, schema, ['user', 'organization']);

    },
    findByUser: async(userID) => {
        const organizations = await db.defaults.findByField('user', userID, schema);
        return (organizations || []).map(organization => {
            return construct(organization)
        });
    },
    remove: async(id) => {
        await db.defaults.removeByFields(['id'], [id], schema);
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema);
    }
}
