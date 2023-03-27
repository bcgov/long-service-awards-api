/*!
 * Global Settings model
 * File: settings.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {settings} = require("../queries/index.queries");

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

const methods = db.generate(schema) || {};
const {construct} = methods || {};

// overload default methods
// - use 'name' as id key
methods.findById = async (name) => {
  return construct(await db.defaults.findOneByField('name', name, schema), schema);
}
methods.create = async (data) => { return construct(await settings.upsert(data), schema) }
methods.update = async (data) => { return construct(await settings.upsert(data), schema) }

module.exports = methods;