/*!
 * Ceremonies model
 * File: ceremonies.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const defaults = require("../queries/default.queries");
const db = require("../queries/index.queries");
const Address = require("./addresses.model");
const { isEmpty } = require("../services/validation.services");
const { ModelConstructor } = require("./constructor.model");
const uuid = require("uuid");

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
const construct = (init, attach = null) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.ceremonies,
    attach: attach,
  });
};

module.exports = {
  schema: schema,
  create: construct,
  /**
   * Updates a attendees selected ceremony
   * @param {Ceremony} ceremony Selected ceremony to be attached onto the attendee
   * @param {Attendee} attendee Attendee data to be updated with new ceremony data (id)
   *  */
  attach: async (ceremony, attendee) => {
    if (!ceremony || !attendee) return null;

    // Add more validation here?

    // ignore attaching ceremony if data is empty, otherwise upsert record
    if (!isEmpty(ceremony.data, ["id"])) {
      await defaults.transact([
        db.attendees.queries.updateCeremony(attendee.id, ceremony.id),
      ]);
    }
  },
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
  findByAttendee: async (id, type) => {
    // For attendees model attachment (get)
    //  looks up existing ceremony info by attendee and constructs as full ceremony object to return back
    return construct(
      await db.attendees.findCeremonyByAttendee(id, type, schema)
    );
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
    // const item = construct(data, schema);
    // if (item)
    //   return construct(await db.ceremonies.insert(item.data, schema, ["id"]));
    return construct(await db.ceremonies.insert(data));
  },
  update: async (data) => {
    return construct(await db.defaults.update(data, schema));
  },
  remove: async (id) => {
    // return await db.defaults.removeByFields(["id"], [id], schema);
    return await db.defaults.remove(id, schema);
  },
  removeAll: async () => {
    return await db.defaults.removeAll(schema);
  },
};
