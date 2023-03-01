/*!
 * Recipients-Contacts model
 * File: recipients-contacts.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const defaults = require("../queries/default.queries");
/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'recipients_contacts',
    attributes: {
        recipient: {
            dataType: 'uuid',
            editable: false
        },
        contact: {
            dataType: 'uuid',
            editable: false
        },
        type: {
            dataType: 'varchar',
        },
    }
};

module.exports = {
    schema: schema,
    associate: (recipient, contact, type) => {
        return defaults.queries.upsert(
            {recipient: recipient, contact: contact, type: type}, schema, ['recipient', 'contact']
        )
    }
}

