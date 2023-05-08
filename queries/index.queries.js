/*!
 * Index SQL queries
 * File: index.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 * @private
 */

const defaults = require("./default.queries.js");
const ceremonies = require("./ceremonies.queries.js");
const awards = require("./awards.queries.js");
const users = require("./users.queries.js");
const recipients = require("./recipients.queries.js");
const attendees = require("./attendees.queries.js");
const organizations = require("./organizations.queries");
const settings = require("./settings.queries");
const { ModelConstructor } = require("../models/constructor.model");

/**
 * Index of query module exports.
 * - Note that the 'generate' function creates default database handlers for a given model schema
 * @public
 */

// model constructor convenience utility
const construct = (init, schema) => {
  return ModelConstructor({ init: init, schema: schema, db: defaults });
};

module.exports = {
  defaults,
  users,
  recipients,
  ceremonies,
  attendees,
  awards,
  organizations,
  settings,
  generate: (schema) => {
    return {
      schema: schema,
      construct: construct,
      findAll: async (filter) => {
        // returns multiple
        return await defaults.findAll(filter, schema);
      },
      findByField: async (field, value, active = true) => {
        // returns multiple
        // - default filter for active record
        return await defaults.findByFields(
          [field, "active"],
          [value, active],
          schema
        );
      },
      findByFields: async (fields, values, active = true) => {
        // returns multiple
        return await defaults.findByFields(fields, values, schema);
      },
      findById: async (id) => {
        return construct(await defaults.findById(id, schema), schema);
      },
      findOneByField: async (field, value) => {
        return construct(
          await defaults.findOneByField(field, value, schema),
          schema
        );
      },
      create: async (data) => {
        // validate model init data
        const item = construct(data, schema);
        if (item)
          return construct(
            await defaults.insert(item.data, schema, ["id"]),
            schema
          );
      },
      update: async (data) => {
        return construct(await defaults.update(data, schema), schema);
      },
      remove: async (id) => {
        return await defaults.removeByFields(["id"], [id], schema);
      },
      removeAll: async () => {
        return await defaults.removeAll(schema);
      },
    };
  },
};
