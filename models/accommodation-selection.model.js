/*!
 * Accommodation Selection model
 * File: accommodation-selection.model.js
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
  modelName: "accommodation_selections",
  attributes: {
    accommodation: {
      dataType: "varchar",
      required: true,
    },
    attendee: {
      dataType: "varchar",
      required: true,
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
  create: async (data) => {
    return construct(await db.accommodation_selections.insert(data));
  },
  remove: async (id) => {
    await db.defaults.remove(id, schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
