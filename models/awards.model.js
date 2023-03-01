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
            editable: false
        },
        vendor: {
            dataType: 'varchar'
        },
        type: {
            dataType: 'varchar'
        },
        milestone: {
            dataType: 'integer'
        },
        label: {
            dataType: 'varchar'
        },
        description: {
            dataType: 'text'
        },
        image_url: {
            dataType: 'varchar'
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

module.exports = db.generate(schema);
