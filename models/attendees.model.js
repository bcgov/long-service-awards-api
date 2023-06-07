/*!
 * Attendees model
 * File: attendees.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const { ModelConstructor } = require("./constructor.model");
const Recipient = require("./recipients.model");
const Contact = require("./contacts.model");
const Ceremony = require("./ceremonies.model");
const Accommodations = require("./accommodation-selection.model");
const organizationsModel = require("./organizations.model");

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
    guest: {
      dataType: "integer",
    },
    status: {
      dataType: "varchar",
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
        // return await Recipient.findByAttendee(id, "recipient");
        // const recipient = await Recipient.findAttachment(
        //   id,
        //   "recipient",
        //   schema
        // );
        // return recipient;

        const recipient = await Recipient.findAttachment(
          id,
          "recipient",
          schema
        );
        const contact = await Contact.findByRecipient(recipient.id, "contact");
        const organization = await organizationsModel.findById(
          recipient.data.organization
        );
        const data = {
          ...recipient.data,
          contact: { ...contact.data },
          organization: { ...organization.data },
        };
        return { data };
      },
      attach: async (attendee, recipient) => {
        await Recipient.attach(attendee, recipient, "recipient");
      },
    },
    ceremony: {
      model: Ceremony,
      required: true,
      get: async (id) => {
        return await Ceremony.findByAttendee(id, "ceremony");
      },
      attach: Ceremony.attach,
    },
    accommodations: {
      model: Accommodations,
      required: false,
      get: async (id) => {
        return await Accommodations.findByAttendee(id, "attendee");
      },
      attach: Accommodations.attach,
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
        //db.recipients.queries.updateAttendee(recipient.id, attendee.id, type),
      ]);
    }
  },
  findAll: async (filter) => {
    return await db.attendees.findAll(filter, schema);
    //return await db.defaults.findAll(filter, schema);
  },
  findById: async (id) => {
    return construct(await db.defaults.findById(id, schema));
  },
  findByCeremony: async (ceremony_id) => {
    await db.defaults.findByField("ceremony", ceremony_id, schema);
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
  // create: async (data) => {
  //   // validate model init data
  //   data.status = "Assigned";
  //   const result = await db.attendees.insert(data);
  //   const item2 = construct(await result);
  //   return item2;
  //   const item = construct(data, schema);
  //   if (item) return construct(await db.attendees.insert(data, schema, ["id"]));
  // },
  create: async (data) => {
    data.status = "Assigned";
    return construct(await db.attendees.insert(data));
  },
  update: async (data) => {
    return construct(await db.defaults.update(data));
  },
  remove: async (id) => {
    await db.defaults.remove(id, schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
  removeGuests: async (recipientID) => {
    await db.attendees.removeGuests(recipientID);
  },
  saveGuest: async (data) => {
    await db.attendees.insertGuest(data.recipient.id, data.ceremony.id, data.status);
  },
  report: async (filter, user, currentCycle) => {
    // check if user is administrator (skip user-org filtering)
    const { role } = user || {};
    const isAdmin = ["super-administrator", "administrator"].includes(
      role.name
    );
    if (isAdmin) {
      return await db.attendees.report(
        filter,
        ["created_at"],
        currentCycle && currentCycle.name,
        schema
      );
    }

    // // restrict available orgs to user assignment
    // // - check filter overlap with user-assigned orgs
    // const { organizations = [] } = user || {};
    // const userFilter = (organizations || []).map(
    //   ({ organization }) => organization.id
    // );
    // // if org-contact has no assigned organizations, return empty results
    // if (["org-contact"].includes(role.name) && organizations.length > 0) {
    //   // explode existing organization filter params
    //   const orgFilter =
    //     filter.hasOwnProperty("organization") &&
    //     filter.organization.split(",").map((id) => parseInt(id));
    //   // filter org params to be contained in user filter
    //   const intersection = userFilter.filter((id) =>
    //     (orgFilter || []).includes(parseInt(id))
    //   );
    //   // ensure org filter is not empty
    //   filter.organization =
    //     intersection.length === 0
    //       ? userFilter.join(",")
    //       : intersection.join(",");
    //   return await db.recipients.report(filter, ["created_at"], schema);
    // }
    // return [];

    //return await db.recipients.report(filter, ["created_at"], schema);
  },
};
