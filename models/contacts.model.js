/*!
 * Contacts model
 * File: contacts.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const Address = require("../models/addresses.model.js");
const RecipientContact = require("./recipients-contacts.model")
const {validateEmail, isEmpty} = require("../services/validation.services");
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
            editable: false
        },
        first_name: {
            dataType: 'varchar',
            validate: []
        },
        last_name: {
            dataType: 'varchar',
            validate: []
        },
        office_email: {
            dataType: 'varchar',
            validate: [validateEmail]
        },
        office_phone: {
            dataType: 'varchar'
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
            get: async (id) => { return await Address.findByContact(id, 'office') },
            attach: async (address, contact) => { await Address.attach(address, contact, 'office') }
        },
        personal_address: {
            model: Address,
            get: async (id) => { return await Address.findByContact(id, 'personal') },
            attach: async (address, contact) => { await Address.attach(address, contact, 'personal') }
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

        // look up any existing recipient contact for given type
        const current = await defaults.findOneByFields(
            ['recipient', 'type'], [recipient.id, type], RecipientContact.schema);

        // if none, create new UUID ID value for contact
        contact.id = current ? current.contact : uuid.v4();
        // detach if contact data is empty, otherwise upsert record
        if (isEmpty(contact.data, ['id', 'recipient', 'type'])) {
            // delete contact record
            await defaults.removeByFields(['id'], [contact.id], schema);
        }
        else {
            // create contact record and associate with recipient
            await defaults.transact([
                defaults.queries.upsert(contact.data, contact.schema),
                defaults.queries.upsert({
                    recipient: recipient.id, contact: contact.id, type: type
                }, RecipientContact.schema, ['recipient', 'contact'])
            ]);
        }
    },
    findAll: async(offset=0, order='asc') => {
        return await db.defaults.findAll( schema, offset, order);
    },
    findByRecipient: async(id, type) => {
        // look up any existing recipient contact
        const current = await defaults.findOneByFields(
            ['recipient', 'type'], [id, type], RecipientContact.schema);
        return current ? construct(await db.defaults.findById(current.contact, schema)) : null;
    },
    findById: async(id) => {
        return construct(await db.defaults.findById(id, schema));
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema);
    }
}
