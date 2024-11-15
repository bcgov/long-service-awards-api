/*!
 * Recipients model
 * File: recipients.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");
const Contact = require("../models/contacts.model.js");
const ServiceSelection = require("../models/service-selections.model.js");
const { ModelConstructor } = require("./constructor.model");
const {
  validateEmployeeNumber,
  isEmpty,
} = require("../services/validation.services");
const Organization = require("./organizations.model");
const User = require("./users.model");
const QualifyingYear = require("./qualifying-years.model");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "recipients",
  attributes: {
    id: {
      dataType: "uuid",
      editable: false,
      required: true,
    },
    status: {
      dataType: "varchar",
      required: true,
    },
    employee_number: {
      dataType: "varchar",
      validators: [validateEmployeeNumber],
      required: true,
    },
    idir: {
      dataType: "varchar",
      editable: false,
    },
    guid: {
      dataType: "varchar",
      editable: false,
      required: true,
    },
    user: {
      dataType: "uuid",
      model: User,
      editable: false,
    },
    organization: {
      dataType: "integer",
      model: Organization,
      required: true,
    },
    division: {
      dataType: "varchar",
      required: true,
    },
    branch: {
      dataType: "varchar",
      required: true,
    },
    attending_with_organization: {
      dataType: "integer",
      model: Organization,
      required: false,
    },
    retirement: {
      dataType: "boolean",
    },
    retirement_date: {
      dataType: "timestamp",
    },
    bcgeu: {
      dataType: "boolean",
    },
    notes: {
      dataType: "text",
    },
    created_at: {
      dataType: "timestamp",
    },
    updated_at: {
      dataType: "timestamp",
    },
  },
  attachments: {
    contact: {
      model: Contact,
      required: true,
      get: async (id) => {
        return await Contact.findByRecipient(id, "contact");
      },
      attach: async (contact, recipient) => {
        await Contact.attach(contact, recipient, "contact");
      },
    },
    supervisor: {
      model: Contact,
      required: true,
      get: async (id) => {
        return await Contact.findByRecipient(id, "supervisor");
      },
      attach: async (contact, recipient) => {
        await Contact.attach(contact, recipient, "supervisor");
      },
    },
    service: {
      model: ServiceSelection,
      required: true,
      get: ServiceSelection.findActiveByRecipient,
      attach: ServiceSelection.attach,
    },
    services: {
      model: [ServiceSelection],
      required: false,
      get: ServiceSelection.findByRecipient,
      attach: ServiceSelection.attachPrevious,
    },
  },
};

/**
 * Model constructor
 *
 * @param {Object} init data
 * @return {Object} model instance
 * @public
 */

const construct = (init) => {
  return ModelConstructor({
    init: init,
    schema: schema,
    db: db.recipients,
  });
};
module.exports = {
  schema: schema,
  create: construct,
  findAll: async (filter, user) => {
    // check if user is administrator (skip user-org filtering)
    const { role } = user || {};
    const isAdmin = ["super-administrator", "administrator"].includes(
      role.name
    );
    if (isAdmin) {
      return await db.recipients.findAll(filter, [], schema);
    }

    // restrict available orgs to user assignment
    // - check filter overlap with user-assigned orgs
    const { organizations = [] } = user || {};
    const userFilter = (organizations || []).map(
      ({ organization }) => organization.id
    );
    // if org-contact has no assigned organizations, return empty results
    if (["org-contact"].includes(role.name) && organizations.length > 0) {
      // explode existing organization filter params
      const orgFilter =
        filter.hasOwnProperty("organization") &&
        filter.organization.split(",").map((id) => parseInt(id));
      // filter org params to be contained in user filter
      const intersection = userFilter.filter((id) =>
        (orgFilter || []).includes(parseInt(id))
      );
      // ensure org filter is not empty
      filter.organization =
        intersection.length === 0
          ? userFilter.join(",")
          : intersection.join(",");
      return await db.recipients.findAll(filter, ["notes"], schema);
    }
    return [];
  },
  findById: async (id, user) => {
    // get recipient data
    const recipient = await db.defaults.findById(id, schema);
    // check if user is administrator (skip user-org filtering)
    const { role } = user || {};

    if (["super-administrator", "administrator"].includes(role.name))
      return construct(recipient);

    // restrict available orgs to user assignment
    // - check filter overlap with assigned orgs
    const { organizations = [] } = user || {};
    const orgFilter = (organizations || []).map(
      ({ organization }) => organization.id
    );
    const { organization } = recipient || {};

    // if recipient has no assigned organizations, proceed (since could be a new registration)
    if (["org-contact"].includes(role.name) && !organization) {
      return construct(recipient);
    }
    // if recipient has assigned org that matches an org-contact assigned org, proceed
    if (
      ["org-contact"].includes(role.name) &&
      organization &&
      orgFilter.includes(organization.id)
    ) {
      return construct(recipient);
    }
    return null;
  },
  findByGUID: async (guid) => {
    return construct(await db.defaults.findOneByField("guid", guid, schema));
  },
  findByUser: async (user) => {
    return await db.defaults.findByField("user", user, schema);
  },
  findByAttendee: async (id, type) => {
    // look up existing recipient contact/supervisor info
    return construct(await db.attendees.findRecipient(id, type, schema));
  },
  countByEmployeeNumber: async (employeeNumber) => {
    // count the number of entries in the DB based on the recipient's employee number (LSA-478)
    return await db.recipients.count( {"employee_number": employeeNumber } );
  },
  findByEmployeeNumber: async (employeeNumber) => {
    return construct(await db.defaults.findOneByField("employee_number", employeeNumber, schema));
  },
  checkForRecipientInCycle: async (employeeNumber, cycle) => {

    return await db.recipients.checkForRecipientInCycle(employeeNumber, cycle);
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
  report: async (filter, user, currentCycle) => {
    // check if user is administrator (skip user-org filtering)
    const { role } = user || {};
    const isAdmin = ["super-administrator", "administrator"].includes(
      role.name
    );
    if (isAdmin) {
      return await db.recipients.report(
        filter,
        ["created_at"],
        currentCycle && currentCycle.name,
        schema
      );
    }

    // restrict available orgs to user assignment
    // - check filter overlap with user-assigned orgs
    const { organizations = [] } = user || {};
    const userFilter = (organizations || []).map(
      ({ organization }) => organization.id
    );
    // if org-contact has no assigned organizations, return empty results
    if (["org-contact"].includes(role.name) && organizations.length > 0) {
      // explode existing organization filter params
      const orgFilter =
        filter.hasOwnProperty("organization") &&
        filter.organization.split(",").map((id) => parseInt(id));
      // filter org params to be contained in user filter
      const intersection = userFilter.filter((id) =>
        (orgFilter || []).includes(parseInt(id))
      );
      // ensure org filter is not empty
      filter.organization =
        intersection.length === 0
          ? userFilter.join(",")
          : intersection.join(",");
      return await db.recipients.report(
        filter,
        ["notes", "created_at"],
        currentCycle && currentCycle.name,
        schema
      );
    }
    return [];
  },
  register: async (data) => {
    return construct(await db.recipients.insert(data));
  },
  delegate: async (data, user) => {
    const cycle = await QualifyingYear.findCurrent();
    // check that data has supervisor and employees
    const { employees = [], supervisor = {} } = data || {};
    if (employees.length === 0 || isEmpty(supervisor)) return null;

    return await db.recipients.delegate(
      data,
      user,
      cycle && cycle.name,
      schema
    );
  },
  count: async (filter, user) => {
    return await db.recipients.count(filter, user, schema);
  },
  stats: async () => {
    const cycle = await QualifyingYear.findCurrent();
    return (await db.recipients.stats(schema, cycle && cycle.name)) || {};
  },
  remove: async (id) => {
    return await db.defaults.removeByFields(["id"], [id], schema);
  },
  removeAll: async () => {
    await db.defaults.removeAll(schema);
  },
};
