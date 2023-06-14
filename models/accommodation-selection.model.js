/*!
 * Accommodation Selection model
 * File: accommodation-selection.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const { ModelConstructor } = require("./constructor.model");
const { isEmpty } = require("../services/validation.services");

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
    attach: attach
  });
};

module.exports = {
  schema: schema,
  /**
   * Updates a attendees selected accommodation
   * @param {Ceremony} accommodation Selected ceremony to be attached onto the attendee
   * @param {Attendee} attendee Attendee data to be updated with new ceremony data (id)
   *  */
  attach: async (accommodation, attendee) => {
    if (!accommodation || !attendee) return null;
    
    await db.accommodation_selections.insert(accommodation.data);
    
  },
  findAll: async (filter) => {
    return await db.defaults.findAll(filter, schema);
  },
  findById: async (id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  findByAttendee: async (id) => {
    // For attendees model attachment (get)
    return construct(
      await db.attendees.findAccommodationsByAttendee(id, schema)
    );
  },
  create: construct,
  insert: async (data) => {
      return construct(await db.accommodation_selections.insert(data));
  },
  remove: async (id) => {
    await db.accommodation_selections.remove(id);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
