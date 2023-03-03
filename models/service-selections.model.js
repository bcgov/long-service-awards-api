/*!
 * Service Selection model
 * File: service-selections.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require('../queries/index.queries');
const {ModelConstructor} = require("./constructor.model");
const AwardSelection = require("./award-selections.model");
const Setting = require("./settings.model");
const defaults = require("../queries/default.queries");
const uuid = require("uuid");
const {isEmpty} = require("../services/validation.services");

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
      editable: false
    },
    recipient: {
      dataType: 'uuid',
      editable: false
    },
    milestone: {
      dataType: 'integer'
    },
    qualifying_year: {
      dataType: 'integer'
    },
    service_years: {
      dataType: 'integer'
    },
    cycle: {
      dataType: 'integer'
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
    const cycle = await Setting.findOneByField('name', 'cycle');
    serviceSelection.cycle = cycle && cycle.value;
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
  findAll: async(offset=0, order='asc') => {
    return await db.defaults.findAll( schema, offset, order);
  },
  findActiveByRecipient: async(recipientID) => {

    /**
     * Finds active service record for current LSA cycle (e.g., 2023)
     * @type {*}
     */

    const cycle = await Setting.findOneByField('name', 'cycle');
    const serviceSelection = await db.defaults.findOneByFields(
        ['recipient', 'cycle'], [recipientID, cycle && cycle.value], schema);
    return construct(serviceSelection)
  },
  findById: async(id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  remove: async(id) => {
    await db.defaults.removeByFields(['id'], id, schema);
  }
}
