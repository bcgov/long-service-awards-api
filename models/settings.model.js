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
      dataType: 'integer',
      required: true
    },
    name: {
      dataType: 'varchar',
      required: true
    },
    label: {
      dataType: 'varchar',
      required: true
    },
    value: {
      dataType: 'varchar',
      required: true
    }
  }
};

module.exports = db.generate(schema);
