/*!
 * Service Selection model
 * File: service-selections.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const AwardSelection = require("./award-selections.model");
const defaults = require("../queries/default.queries");
const uuid = require("uuid");
const {isEmpty} = require("../services/validation.services");
const QualifyingYear = require("./qualifying-years.model");

'use strict';

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: 'service_selections',
  attributes: {
    id: {
      dataType: 'uuid',
      editable: false,
      required: true
    },
    recipient: {
      dataType: 'uuid',
      editable: false,
      required: true
    },
    milestone: {
      dataType: 'integer',
      required: true
    },
    qualifying_year: {
      dataType: 'integer',
      required: true
    },
    service_years: {
      dataType: 'integer',
      required: true
    },
    cycle: {
      dataType: 'integer',
      required: true
    },
    previous_registration: {
      dataType: 'boolean',
    },
    previous_award: {
      dataType: 'boolean',
    },
    confirmed: {
      dataType: 'boolean',
    },
    ceremony_opt_out: {
      dataType: 'boolean',
    },
    survey_opt_in: {
      dataType: 'boolean'
    },
    delegated: {
      dataType: 'boolean'
    },
    created_at: {
      dataType: 'timestamp',
      editable: false
    },
    updated_at: {
      dataType: 'timestamp'
    }
  },
  attachments: {
    awards: {
      model: AwardSelection,
      required: false,
      get: AwardSelection.findById,
      attach: AwardSelection.attach
    }
  }
};

/**
 * Model constructor
 *
 * @param {Object} init initial data
 * @param {Function} attach attachment method
 * @return {Object} model instance
 * @public
 */

const construct = (init, attach=null) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.defaults,
    attach: attach
  });
}

module.exports =  {
  schema: schema,
  create: construct,
  attach: async(serviceSelection, recipient) => {

    /**
     * Attach service selection to recipient for LSAs
     * @public
     */

    // ignore empty request data
    if (isEmpty(serviceSelection.data)) return;

    // set reference values
    const cycle = await QualifyingYear.findCurrent();
    serviceSelection.cycle = cycle && cycle.name;
    serviceSelection.recipient = recipient.id;
    serviceSelection.delegated = false;

    // Find active service record for current LSA cycle year (e.g., 2023)
    const current = await db.defaults.findOneByFields(
        ['recipient', 'cycle'], [recipient.id, serviceSelection.cycle], schema);

    // check for milestone changes
    // - if different, delete service record from db (deletes any attached awards)
    if (current && current.milestone !== serviceSelection.milestone) await serviceSelection.delete();

    // use existing service record ID / or generate new ID
    serviceSelection.id = current ? current.id : uuid.v4();
    // upsert record
    return await defaults.upsert(serviceSelection.data, serviceSelection.schema);
  },
  findActiveByRecipient: async(recipientID) => {

    /**
     * Finds active service record for current LSA cycle (e.g., 2023)
     */

    const cycle = await QualifyingYear.findCurrent();
    const serviceSelection = await db.defaults.findOneByFields(
        ['recipient', 'cycle'], [recipientID, cycle && cycle.name], schema);
    return construct(serviceSelection)
  },
  findByRecipient: async(recipientID) => {

    /**
     * Finds all service records for recipient
     */

    const services = await db.defaults.findByField('recipient', recipientID, schema);
    return (services || []).map(service => {
      return construct(service)
    });
  },
  findById: async(id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  remove: async(id) => {
    await db.defaults.removeByFields(['id'], id, schema);
  }
}
