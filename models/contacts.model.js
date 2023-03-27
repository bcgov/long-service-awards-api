/*!
 * Contacts model
 * File: contacts.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const Address = require("../models/addresses.model.js");
const {validateEmail, isEmpty, validatePhone} = require("../services/validation.services");
const {ModelConstructor} = require("./constructor.model");
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
    modelName: 'contacts',
    attributes: {
        id: {
            dataType: 'uuid',
            editable: false,
            required: true
        },
        first_name: {
            dataType: 'varchar',
            required: true
        },
        last_name: {
            dataType: 'varchar',
            required: true
        },
        office_email: {
            dataType: 'varchar',
            required: true,
            validate: [validateEmail]
        },
        office_phone: {
            dataType: 'varchar',
            validate: [validatePhone]
        },
        personal_email: {
            dataType: 'varchar',
            validate: [validateEmail]
        },
        personal_phone: {
            dataType: 'varchar'
        },
        created_at: {
            dataType: 'timestamp',
            editable: false
        },
        updated_at: {
            dataType: 'timestamp'
        }
    },
    attachments: {
        office_address: {
            model: Address,
            required: true,
            get: async (id) => { return await Address.findAttachment(id, 'office_address', schema) },
            attach: async (address, contact) => { await Address.attach(address, contact, 'office_address') }
        },
        personal_address: {
            model: Address,
            get: async (id) => { return await Address.findAttachment(id, 'personal_address', schema) },
            attach: async (address, contact) => { await Address.attach(address, contact, 'personal_address') }
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
    attach: async (contact, recipient, type) => {

        if (!contact || !recipient || !type) return null;

        // if no contact ID, create new UUID ID value and set recipient attribute
        contact.id = recipient.hasOwnProperty(type) && recipient[type] ? recipient[type] : uuid.v4();
        recipient[type] = contact.id;

        // ignore attach contact if data is empty, otherwise upsert record
        if (!isEmpty(contact.data, ['id'])) {
            await defaults.transact([
                defaults.queries.upsert(contact.data, schema),
                db.recipients.queries.updateContact(recipient.id, contact.id, type)
            ]);
        }
    },
    findByRecipient: async(id, type) => {
        // look up existing recipient contact/supervisor info
        return construct(await db.recipients.findContact(id, type, schema));
    },
    findById: async(id) => {
        return construct(await db.defaults.findById(id, schema));
    },
    removeAll: async() => {
        return await db.defaults.removeAll(schema);
    }
}
