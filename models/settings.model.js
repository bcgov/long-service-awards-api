/*!
 * Global Settings model
 * File: settings.model.js
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
  modelName: 'settings',
  attributes: {
    id: {
      dataType: 'integer'
    },
    name: {
      dataType: 'varchar'
    },
    label: {
      dataType: 'varchar'
    },
    value: {
      dataType: 'varchar'
    }
  }
};

module.exports = db.generate(schema);
