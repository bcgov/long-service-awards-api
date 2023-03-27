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

        // if no address ID, create new UUID ID value and set recipient attribute
        address.id = reference.hasOwnProperty(type) && reference[type] ? reference[type] : uuid.v4();
        reference[type] = address.id;

        // ignore attach if data is empty, otherwise upsert record
        if (!isEmpty(address.data, ['id', 'pobox', 'street2'])) {
            await defaults.transact([
                defaults.queries.upsert(address.data, schema),
                defaults.queries.updateAttachment(reference.id, address.id, type, reference.schema)
            ]);
        }
    },
    findAttachment: async(parentID, parentField, parentschema) => {
        // look up addresses for requested reference and type
        return construct(await defaults.findAttachment(parentID, parentField, parentschema, schema));
    },
    remove: async(id) => {
        await db.defaults.remove(id, schema)
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema)
    }
}
