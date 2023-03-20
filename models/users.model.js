/*!
 * User model
 * File: users.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {validateGUID, validateEmail, validateRequired} = require("../services/validation.services");
const {ModelConstructor} = require("./constructor.model");
const OrganizationSelection = require("./user-organization-selections.model");
const UserRole = require("./user-roles.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'users',
    attributes: {
        id: {
            dataType: 'uuid',
            required: true,
            editable: false
        },
        guid: {
            dataType: 'varchar',
            required: true,
            validate: [validateGUID, validateRequired],
            editable: false
        },
        idir: {
            dataType: 'varchar',
            required: true,
            validate: [validateRequired],
            editable: false
        },
        role: {
            dataType: 'varchar',
            required: true,
            model: UserRole
        },
        first_name: {
            dataType: 'varchar'
        },
        last_name: {
            dataType: 'varchar'
        },
        email: {
            dataType: 'varchar',
            validate: [validateEmail]
        },
        password: {
            dataType: 'varchar',
            restricted: true
        }
    },
    attachments: {
        organizations: {
            model: [OrganizationSelection],
            attach: OrganizationSelection.attach,
            get: OrganizationSelection.findByUser
        }
    }
};

/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @return {Object} model instance
 * @public
 */

const construct = (init) => {
    return ModelConstructor({
        init: init,
        schema: schema,
        db: db.users
    });
}

module.exports =  {
    schema: schema,
    create: construct,
    findAll: async(filter) => {
        return await db.defaults.findAll(filter, schema);
    },
    find: async(id) => {
        return construct(await db.users.findById(id, schema));
    },
    findById: async(id) => {
        return construct(await db.users.findById(id, schema));
    },
    findByGUID: async(guid) => {
        return construct(await db.users.findOneByField('guid', guid, schema));
    },
    findByEmail: async(email) => {
        // note: includes password
        return construct(await db.users.findOneByField('email', email, schema));
    },
    register: async(data) => {
        return construct(await db.users.insert(data));
    },
    remove: async(id) => {
        return await db.defaults.removeByFields(['id'], [id], schema);
    },
    removeAll: async() => {
        return await db.defaults.removeAll(schema)
    }
}
