/*!
 * Recipients SQL queries
 * File: recipients.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { transactionOne, query, queryOne } = require("../db");
const uuid = require("uuid");
const {
  findById,
  update,
  queries,
  attachReferences,
} = require("./default.queries");
const defaults = require("./default.queries");

/**
 * Recipient custom queries
 * - findall
 * - insert (stub)
 * - update
 * - stats (recipients aggregate stats)
 * */

const attendeesQueries = {
  findAll: (filter, schema) => {
      // destructure filter
  const {
    orderby = null,
    order = "ASC",
    offset = 0,
    limit = null,
    first_name = null,
    last_name = null,

  } = filter || {};
  // (optional) order by attribute
  //const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : "";
  const orderClause = order && orderby ? `ORDER BY attendees.id ${order}` : "";
  const limitClause = limit ? `LIMIT ${limit}` : "";

  const filters = [];
  if (filter.hasOwnProperty("first_name"))
    filters.push(`contacts.first_name = ${filter.first_name}`);
  if (filter.hasOwnProperty("last_name"))
    filters.push(`contacts.last_name IN (${filter.last_name})`);
  if (filter.hasOwnProperty("ceremony"))
    filters.push(`attendees.ceremony = '${filter.ceremony}'`);
  if (filter.hasOwnProperty("status"))
    filters.push(`attendees.status = ${filter.status}`);
  if (filter.hasOwnProperty("organization"))
    filters.push(`contacts.organization = ${filter.organization}`);
  const WHEREfilter =
    filters.length > 0 ? `WHERE  ${filters.join(" AND ")}` : "";


  // get query results
    return {
    sql: `SELECT attendees.*
              FROM ${schema.modelName} 
              LEFT JOIN  
              ceremonies ON ceremonies.id = attendees.ceremony
              ${WHEREfilter} 
              ${orderClause} ${limitClause}
              OFFSET ${offset};`,
    data: [],
  };

  },
  insert: (data) => {
    // destructure user stub data
    const {
      id = null,
      recipient = null,
      ceremony = null,
      guest = 0,
      status = null,
    } = data || {};

    return {
      sql: `WITH upsert AS (
            UPDATE attendees
            SET ceremony = $3::uuid
            WHERE attendees.recipient = $2::uuid
            RETURNING *
            )
            INSERT INTO attendees (id, recipient, ceremony, guest, status) 
            SELECT $1::uuid,$2::uuid,$3::uuid,$4::integer,$5::varchar
            WHERE NOT EXISTS (SELECT * FROM upsert)
            ON CONFLICT DO NOTHING
            RETURNING *;`,
      data: [id, recipient, ceremony, guest, status],
    };
  },
  update: (data, schema) => {
    if (!schema.modelName) return null;

    // timestamp fields
    const timestamps = ["updated_at"];

    // filter ignored columns:
    const ignore = ["id", "created_at"];
    const cols = Object.keys(schema.attributes).filter(
      (key) => !ignore.includes(key)
    );

    // generate prepared statement value placeholders
    // - NOTE: index shift to account for ID and created datetime values
    let index = 2;
    const assignments = cols.map((attr) => {
      // handle timestamp placeholder defined in arguments
      const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

      // map returns conjoined prepared parameters in order
      return [
        `"${attr}"`,
        `${placeholder}::${schema.attributes[attr].dataType}`,
      ].join("=");
    });

    let sql = `        UPDATE attendees
                       SET ${assignments.join(",")}
                       WHERE id = $1::${schema.attributes.id.dataType}
                       RETURNING *;`;

    // position ID, creation datetime values at front of array
    let filteredData = [data.id];

    // filter input data to match update parameters
    filteredData.push(
      ...Object.keys(schema.attributes)
        .filter((key) => !ignore.includes(key) && !timestamps.includes(key))
        .map((key) => {
          return data[key];
        })
    );

    // DEBUG SQL
    // console.log('UPDATE:', {sql: sql, data: filteredData})

    // apply update query
    return { sql: sql, data: filteredData };
  },
  findRecipient: (id) => {
    return {
      sql: `SELECT recipients.* FROM recipients
                  JOIN attendees ON recipients.id = ${id}
                  WHERE attendees.id = $1::uuid;`,
      data: [id],
    };
  },
  findCeremonyByAttendee: (id, type) => {
    const attendeeRef = "attendees.ceremony";
    type === "attendee" ? "recipients.contact" : "recipients.supervisor";
    return {
      sql: `SELECT ceremonies.* FROM ceremonies
                JOIN attendees ON ceremonies.id = ${attendeeRef}
                WHERE attendees.id = $1::uuid;`,
      data: [id],
    };
  },
  updateCeremony: (attendeeID, ceremonyID) => {
    return {
      sql: `UPDATE attendees
                  SET ceremony = $2::uuid
                  WHERE attendees.id = $1::uuid
                  RETURNING *;`,
      data: [attendeeID, ceremonyID],
    };
  },
  report: (filter, ignore = [], currentCycle, schema) => {
    /**
     * Generate query: Report recipients data
     *
     * @param schema
     * @param {Object} filter
     * @param {Array} ignore
     * @return {Promise} results
     * @public
     */

    // get column filters
    const [filterStatements, filterValues] = getFilters(filter);

    // get additional (inner join) service filter
    const serviceFilters = [];
    if (filter.hasOwnProperty("cycle"))
      serviceFilters.push(`srv.cycle = ${filter.cycle}`);
    if (filter.hasOwnProperty("milestones"))
      serviceFilters.push(`srv.milestone IN (${filter.milestones})`);
    if (filter.hasOwnProperty("confirmed"))
      serviceFilters.push(`srv.confirmed = ${filter.confirmed}`);
    if (currentCycle) serviceFilters.push(`srv.cycle = ${currentCycle}`);
    const serviceFilter =
      serviceFilters.length > 0 ? `WHERE  ${serviceFilters.join(" AND ")}` : "";

    // get column selections
    const selections = Object.keys(schema.attributes)
      .filter((field) => !ignore.includes(field))
      .map((field) => "r." + field)
      .join(", ");

    return {
      sql: `SELECT 
      attendees.id AS "attendee_id",
      contacts.first_name,
      contacts.last_name,
      ceremonies.datetime AS "ceremony_datetime",
      organizations.name AS "ministry",
      recipients.branch,
      attendees.status,
      string_agg(accommodation_selections.accommodation::varchar,',') AS accomodations
      
      
      FROM attendees
      LEFT JOIN recipients ON attendees.recipient = recipients.id
      LEFT JOIN contacts ON recipients.contact = contacts.id
      LEFT JOIN ceremonies ON attendees.ceremony = ceremonies.id
      LEFT JOIN organizations ON recipients.organization = organizations.id
      LEFT JOIN accommodation_selections ON attendees.id = accommodation_selections.attendee
      GROUP BY attendee_id, first_name, last_name, ceremony_datetime, ministry, branch, attendees.status`
    };
  },
};
exports.queries = attendeesQueries;

const getFilters = (data) => {
  // init
  let values = [];
  let index = 1;

  /**
   * List of filter options for recipients
   * - Recipient first name
   * - Recipient last name
   * - Recipient Employee Number
   * - Organization
   * - Milestones
   * - Confirmed
   * - Ceremony Opt Out
   * - Status
   * */

  const filters = {
    first_name: () =>
      `(contacts.first_name ILIKE '%' || $${index++}::varchar || '%')`,
    last_name: () =>
      `(contacts.last_name ILIKE '%' || $${index++}::varchar || '%')`,
    idir: () => `(recipients.idir LIKE '%' || $${index++}::varchar || '%')`,
    employee_number: () =>
      `(recipients.employee_number LIKE '%' || $${index++}::varchar || '%')`,
    organization: (range) =>
      `(organizations.id IN (${(range || [])
        .map(() => `$${index++}::integer`)
        .join(",")}))`,
    milestones: (range) =>
      `(service_selections.milestone IN (${(range || [])
        .map(() => `$${index++}::integer`)
        .join(",")}))`,
    cycle: (range) =>
      `(service_selections.cycle IN (${(range || [])
        .map(() => `$${index++}::integer`)
        .join(",")}))`,
    qualifying_year: (range) =>
      `(service_selections.qualifying_year IN (${(range || [])
        .map(() => `$${index++}::integer`)
        .join(",")}))`,
    confirmed: (value) => `(
        service_selections.confirmed = $${index++}::boolean 
        ${
          value[0] === "false" ? "OR service_selections.confirmed IS NULL" : ""
        } )`,
    ceremony_opt_out: (value) => `(
        service_selections.ceremony_opt_out = $${index++}::boolean 
        ${
          value[0] === "false"
            ? "OR service_selections.ceremony_opt_out IS NULL"
            : ""
        } )`,
    status: () => `(recipients.status = $${index++}::varchar)`,
  };
  // match filter with input data
  let statements = "";
  statements += Object.keys(data)
    .filter((key) => filters.hasOwnProperty(key))
    .reduce((o, key) => {
      // explode comma-separated query array parameters into array
      const datum = !!data[key] && data[key].split(",");
      // ignore null/empty filter values
      if (datum) {
        o.push(filters[key](datum));
        values.push.apply(values, datum);
      }
      return o;
    }, [])
    .join(" AND \n");

  // return filter statements and values
  return [statements, values];
};

exports.findAll = async (filter, schema) => {
  const result =  await query(attendeesQueries.findAll(filter, schema));

    // attach linked records to results
    return await Promise.all(
      (result || []).map(async (item) => {
        return await attachReferences(item, schema);
      }));
};

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.insert = async (data) => {
  // generate UUID for recipient
  data.id = uuid.v4();
  return await transactionOne([attendeesQueries.insert(data)]);
};

exports.update = async (data, schema) => {
  return await transactionOne([attendeesQueries.update(data, schema)]);
};

exports.findRecipient = async (id, type, schema) => {
  const result = await queryOne(attendeesQueries.findRecipient(id, type));
  return await attachReferences(result, schema);
};

exports.findCeremonyByAttendee = async (id, type, schema) => {
  const result = await queryOne(
    attendeesQueries.findCeremonyByAttendee(id, type)
  );
  return await attachReferences(result, schema);
};

exports.update = async (data) => {
  return await transactionOne([attendeesQueries.update(data)]);
};

/**
 * Generate query: Report recipients data
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.report = async (filter, ignore, currentCycle, schema) => {
  // DEBUG SQL
  // console.log(recipientQueries.report(filter, ignore, currentCycle, schema))
  return await query(attendeesQueries.report(filter, ignore, currentCycle, schema));
};
/**
 * Default transactions
 * @public
 */

exports.findById = findById;

