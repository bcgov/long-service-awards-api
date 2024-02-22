/*!
 * Organizations model
 * File: organizations.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const { ModelConstructor } = require("./constructor.model");
const defaults = require("../queries/default.queries");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "organizations",
  attributes: {
    id: {
      dataType: "integer",
      required: true,
    },
    abbreviation: {
      dataType: "varchar",
      required: true,
    },
    name: {
      dataType: "varchar",
      required: true,
    },
    previous_service_pins: {
      dataType: "boolean",
    },
    bulk: {
      dataType: "boolean",
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
    attach: attach,
  });
};

module.exports = {
  schema: schema,
  findAll: async (filter = {}, user = null) => {
    // restrict list of orgs for organizational/ministry contacts to assigned values
    const { organizations, role } = user || {};
    if (role && ["org-contact"].includes(role.name)) {
      filter.organizations = (organizations || []).map(
        ({ organization }) => organization.id
      );
      // return empty results if no organizations are assigned
      return filter.organizations.length > 0
        ? await db.organizations.findAll(
            { ...(filter || {}), ...{ orderby: "name", order: "ASC" } },
            schema
          )
        : [];
    }
    // return unfiltered results
    return await db.organizations.findAll(
      { ...(filter || {}), ...{ orderby: "name", order: "ASC" } },
      schema
    );
  },
  findByField: async (field, value) => {
    return await defaults.findByField(field, value, schema, {
      orderby: "name",
      order: "ASC",
    });
  },
  findById: async (id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  create: async (data) => {
    return construct(await db.defaults.insert(data, schema, ["id"]));
  },
  update: async (data) => {
    return construct(await defaults.update(data, schema));
  },
  remove: async (id) => {
    await db.defaults.removeByFields(["id"], [id], schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
