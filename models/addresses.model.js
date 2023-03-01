/*!
 * Addresses model
 * File: addresses.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const {validatePostcode, isEmpty, validateRequired} = require("../services/validation.services");
const defaults = require("../queries/default.queries");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'addresses',
    attributes: {
        contact: {
            dataType: 'uuid',
            editable: false
        },
        type: {
            dataType: 'varchar',
            editable: false
        },
        pobox: {
            dataType: 'varchar'
        },
        street1: {
            dataType: 'varchar',
        },
        street2: {
            dataType: 'varchar',
        },
        postal_code: {
            dataType: 'varchar',
            validate: [validatePostcode]
        },
        community: {
            dataType: 'varchar',
        },
        province: {
            dataType: 'varchar',
        },
        country: {
            dataType: 'varchar',
        },
        created_at: {
            dataType: 'timestamp',
            editable: false
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
    attach: async(address, contact, type) => {
        // reference contact ID and type values to address record
        const {id=null} = contact || {};
        address.contact = id;
        address.type = type;
        // check if address is empty (detach if so)
        return isEmpty(address.data, ['contact', 'type'])
            ? await defaults.removeByFields(['contact', 'type'], [id, type], address.schema)
            : await defaults.upsert(address.data, address.schema, ['contact', 'type']);

    },
    findAll: async(offset=0, order='asc') => {
        return await db.defaults.findAll( schema, offset, order)
    },
    findByContact: async(contactID, type) => {
        return construct(await db.defaults.findOneByFields(['contact', 'type'], [contactID, type], schema));
    },
    remove: async(id) => {
        await db.defaults.remove(id, schema)
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema)
    }
}
