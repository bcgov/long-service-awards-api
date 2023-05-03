/*!
 * Attendees model
 * File: attendees.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const { ModelConstructor } = require("./constructor.model");
const Recipient = require("./recipients.model");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "attendees",
  attributes: {
    id: {
      dataType: "uuid",
      editable: false,
      required: true,
    },
    status: {
      dataType: "varchar",
    },
    guest: {
      dataType: "integer",
    },
    created_at: {
      dataType: "timestamp",
    },
    updated_at: {
      dataType: "timestamp",
    },
  },
  attachments: {
    recipient: {
      model: Recipient,
      required: true,
      get: async (id) => {
        return await Recipient.findAttachment(id, "recipient", schema);
      },
      attach: async (attendee, recipient) => {
        await Recipient.attach(attendee, recipient, "recipient");
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

const construct = (init, attach) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.defaults,
    attach: attach,
  });
};

module.exports = {
  schema: schema,
  attach: async (attendee, recipient, type) => {
    if (!attendee || !recipient || !type) return null;

    // if no attendee ID, create new UUID ID value and set recipient attribute
    attendee.id =
      recipient.hasOwnProperty(type) && recipient[type]
        ? recipient[type]
        : uuid.v4();
    recipient[type] = attendee.id;

    // ignore attach attendee if data is empty, otherwise upsert record
    if (!isEmpty(attendee.data, ["id"])) {
      await defaults.transact([
        defaults.queries.upsert(attendee.data, schema),
        db.recipients.queries.updateAttendee(recipient.id, attendee.id, type),
      ]);
    }
  },
  findAll: async (filter) => {
    return await db.defaults.findAll(filter, schema);
  },
  findById: async (id) => {
    await db.defaults.findById(id, schema);
  },
  findByCeremony: async (ceremony_id) => {
    await db.defaults.findByField("ceremony", ceremony_id, schema);
  },
  create: async (data) => {
    await db.defaults.insert(data, schema);
  },
  update: async (data) => {
    await db.defaults.update(data, schema);
  },
  remove: async (id) => {
    await db.defaults.remove(id, schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
