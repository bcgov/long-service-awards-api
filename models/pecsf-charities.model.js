/*!
 * PECSF charities model
 * File: pecsf-charities.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: 'pecsf_charities',
  attributes: {
    id: {
      dataType: 'integer',
      required: true
    },
    vendor: {
      dataType: 'varchar'
    },
    name: {
      dataType: 'varchar',
      required: true
    },
    region: {
      dataType: 'varchar',
      required: true
    }
  }
};

module.exports = db.generate(schema);
