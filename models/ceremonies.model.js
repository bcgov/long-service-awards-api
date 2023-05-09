/*!
 * Ceremonies model
 * File: ceremonies.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const Address = require("./addresses.model");
const { ModelConstructor } = require("./constructor.model");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "ceremonies",
  attributes: {
    id: {
      dataType: "uuid",
      editable: false,
      required: true,
    },
    venue: {
      dataType: "varchar",
      required: true,
    },
    datetime: {
      dataType: "timestamp",
      required: true,
    },
    created_at: {
      dataType: "timestamp",
      required: true,
    },
    updated_at: {
      dataType: "timestamp",
      required: true,
    },
    active: {
      dataType: "boolean",
    },
  },
  attachments: {
    address: {
      model: Address,
      required: true,
      get: async (id) => {
        return await Address.findAttachment(id, "address", schema);
      },
      attach: async (address, ceremony) => {
        await Address.attach(address, ceremony, "address");
      },
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
const construct = (init) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.ceremonies,
  });
};

module.exports = {
  schema: schema,
  create: construct,
  findAll: async (filter) => {
    // returns multiple
    return await db.defaults.findAll(filter, schema);
  },
  findByField: async (field, value, active = true) => {
    // returns multiple
    return await db.defaults.findByFields(
      [field, "active"],
      [value, active],
      schema
    );
  },
  findById: async (id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  findOneByField: async (field, value) => {
    return await db.defaults.findOneByField(field, value, schema);
  },
  findAttachment: async (parentID, parentField, parentSchema) => {
    // look up addresses for requested reference and type
    return construct(
      await db.defaults.findAttachment(
        parentID,
        parentField,
        parentSchema,
        schema
      )
    );
  },
  register: async (data) => {
    // validate model init data
    const item = construct(data, schema);
    if (item)
      return construct(await db.ceremonies.insert(item.data, schema, ["id"]));
  },
  update: async (data) => {
    return construct(await db.defaults.update(data, schema));
  },
  remove: async (id) => {
    return await db.defaults.removeByFields(["id"], [id], schema);
  },
  removeAll: async () => {
    return await db.defaults.removeAll(schema);
  },
};
