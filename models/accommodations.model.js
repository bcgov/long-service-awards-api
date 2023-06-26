/*!
 * Accommodations model
 * File: accommodations.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const { ModelConstructor } = require("./constructor.model");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "accommodations",
  attributes: {
    name: {
      dataType: "varchar",
      required: true,
    },
    label: {
      dataType: "label",
      required: true,
    },
    type: {
      dataType: "varchar",
      required: true,
    },
    description: {
      dataType: "text",
    },
    active: {
      dataType: "boolean",
    },
  },
};

/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @param {Function} attach attachment method
 * @return {Object} model instance
 * @public
 */

const construct = (init, attach = null) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.defaults,
  });
};

module.exports = {
  schema: schema,
  findAll: async (filter) => {
    return await db.defaults.findAll(filter, schema);
  },
  findById: async (id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  remove: async (id) => {
    await db.defaults.remove(id, schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
