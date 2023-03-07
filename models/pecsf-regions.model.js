/*!
 * PECSF regions model
 * File: pecsf-regions.model.js
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
  modelName: 'pecsf_regions',
  attributes: {
    name: {
      dataType: 'varchar',
      required: true
    },
  }
};

module.exports = db.generate(schema);
