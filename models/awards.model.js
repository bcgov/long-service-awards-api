/*!
 * Awards model
 * File: awards.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const AwardOption = require("./award-options.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'awards',
    attributes: {
        id: {
            dataType: 'integer',
            required: true,
            serial: true,
            editable: false
        },
        short_code: {
            dataType: 'varchar'
        },
        type: {
            dataType: 'varchar',
            required: true
        },
        milestone: {
            dataType: 'integer',
            required: true
        },
        label: {
            dataType: 'varchar',
            required: true
        },
        description: {
            dataType: 'text'
        },
        image_url: {
            dataType: 'varchar'
        },
        quantity: {
            dataType: 'integer'
        },
        active: {
            dataType: 'boolean'
        }
    },
    attachments: {
        options: {
            model: AwardOption,
            get: AwardOption.findByAward,
            attach: AwardOption.attach
        }
    }
};

const methods = db.generate(schema);

// overload default methods
methods.findAll = async (filter) => {
    return await db.awards.findAll(filter);
}

module.exports = methods;
