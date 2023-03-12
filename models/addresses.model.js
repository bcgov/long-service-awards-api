/*!
 * Address model
 * File: addresses.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const {validatePostcode, isEmpty } = require("../services/validation.services");
const defaults = require("../queries/default.queries");
const uuid = require("uuid");

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
        id: {
            dataType: 'uuid',
            editable: false,
            required: true
        },
        contact: {
            dataType: 'uuid',
            required: false,
            editable: false
        },
        ceremony: {
            dataType: 'uuid',
            required: false,
            editable: false
        },
        type: {
            dataType: 'varchar',
            required: true
        },
        pobox: {
            dataType: 'varchar'
        },
        street1: {
            dataType: 'varchar',
            required: true
        },
        street2: {
            dataType: 'varchar',
        },
        postal_code: {
            dataType: 'varchar',
            required: true,
            validate: [validatePostcode]
        },
        community: {
            dataType: 'varchar',
            required: true
        },
        province: {
            dataType: 'varchar',
            required: true
        },
        country: {
            dataType: 'varchar',
            required: true
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
    attach: async(address, reference, type) => {

        if (!address || !reference || !type) return null;

        // set reference key
        const referenceType = reference.schema.modelName === 'contacts' ? 'contact' : 'ceremony';

        // look up any existing referenced address for given type
        const current = await defaults.findOneByFields(
            [referenceType, 'type'], [reference.id, type], schema);

        // if none, create new UUID ID value for address
        address.id = current ? current.id : uuid.v4();

        // update address references
        address[referenceType] = reference.id;
        address.type = type;

        // confirm address data is not empty to upsert record
        if (!isEmpty(address.data, ['id', 'contact', 'ceremony', 'type', 'pobox', 'street2'])) {
            await defaults.transact([defaults.queries.upsert(address.data, schema)]);
        }
    },
    findByContact: async(contact, type) => {
        // look up addresses for requested contact and type
        return construct(await defaults.findOneByFields(['contact', 'type'], [contact, type], schema));
    },
    findByCeremony: async(ceremony, type) => {
        // look up addresses for requested ceremony and type
        return construct(await defaults.findOneByFields(['ceremony', 'type'], [ceremony, type], schema));
    },
    remove: async(id) => {
        await db.defaults.remove(id, schema)
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema)
    }
}
