/*!
 * Ceremonies model
 * File: ceremonies.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const Address = require("./addresses.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
    modelName: 'ceremonies',
    attributes: {
        id: {
            dataType: 'integer',
            required: true
        },
        venue: {
            dataType: 'integer',
            required: true
        },
        datetime: {
            dataType: 'timestamp',
            required: true
        },
        active: {
            dataType: 'boolean'
        }
    },
    attachments: {
        address: {
            model: Address,
            required: true,
            get: async (id) => { return await Address.findAttachment(id, 'address') },
            attach: async (address, ceremony) => { await Address.attach(address, ceremony, 'address') }
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

module.exports = db.generate(schema);