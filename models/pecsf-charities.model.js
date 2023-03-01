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
      dataType: 'integer'
    },
    vendor: {
      dataType: 'varchar'
    },
    name: {
      dataType: 'varchar'
    },
    created_at: {
      dataType: 'timestamp'
    },
    updated_at: {
      dataType: 'timestamp'
    }
  }
};

module.exports = db.generate(schema);
