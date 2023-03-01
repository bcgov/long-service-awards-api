/*!
 * Recipients model
 * File: recipients.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const Contact = require("../models/contacts.model.js");
const ServiceSelection = require('../models/service-selections.model.js');
const {ModelConstructor} = require("./constructor.model");
const Organization = require("./organizations.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'recipients',
    attributes: {
        id: {
            dataType: 'uuid',
            editable: false
        },
        status: {
            dataType: 'varchar',
            editable: false
        },
        employee_number: {
            dataType: 'integer',
        },
        idir: {
            dataType: 'varchar',
            editable: false
        },
        guid: {
            dataType: 'varchar',
            editable: false
        },
        user: {
            dataType: 'uuid',
            editable: false
        },
        organization: {
            dataType: 'integer',
            model: Organization,
        },
        division: {
            dataType: 'varchar',
        },
        branch: {
            dataType: 'varchar',
        },
        retirement: {
            dataType: 'boolean',
        },
        retirement_date: {
            dataType: 'timestamp',
        },
        bcgeu: {
            dataType: 'boolean',
        },
        previous_registration: {
            dataType: 'boolean',
        },
        notes: {
            dataType: 'text'
        },
        created_at: {
            dataType: 'timestamp'
        },
        updated_at: {
            dataType: 'timestamp'
        }
    },
    attachments: {
        contact: {
            model: Contact,
            get: async (id) => { return await Contact.findByRecipient(id, 'contact') },
            attach: async (contact, recipient) => { await Contact.attach(contact, recipient, 'contact') }
        },
        supervisor: {
            model: Contact,
            get: async (id) => { return await Contact.findByRecipient(id, 'supervisor') },
            attach: async (contact, recipient) => { await Contact.attach(contact, recipient, 'supervisor') }
        },
        service: {
            model: ServiceSelection,
            get: ServiceSelection.findActiveByRecipient,
            attach: ServiceSelection.attach
        }
    }
};


/**
 * Model constructor
 *
 * @param {Object} init data
 * @return {Object} model instance
 * @public
 */

const construct = (init) => {
    return ModelConstructor({
        init: init,
        schema: schema,
        db: db.recipients
    });
}

module.exports =  {
    schema: schema,
    create: construct,
    findAll: async(offset=0, order='asc') => {
        return await db.defaults.findAll( schema, offset, order);
    },
    findById: async(id) => {
        return construct(await db.defaults.findById(id, schema));
    },
    findByGUID: async(guid) => {
        return construct(await db.defaults.findOneByField('guid', guid, schema));
    },
    findByUser: async(user) => {
        return await db.defaults.findByField('user', user, schema);
    },
    register: async(data) => {
        return construct(await db.recipients.insert(data));
    },
    delegate: async(data, user) => {
        return await db.recipients.delegate(data, user, schema);
    },
    remove: async(id) => {
        return await db.defaults.removeByFields( ['id'], [id], schema)
    },
    removeAll: async() => {
        await db.defaults.removeAll(schema)
    }
}
