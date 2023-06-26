/*!
 * Recipients SQL queries
 * File: recipients.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { transactionOne, query, queryOne } = require("../db");
const uuid = require("uuid");
const { findById, queries, attachReferences } = require("./default.queries");
const defaults = require("./default.queries");

/**
 * Recipient column query statements
 * @param {Object} data
 * @return {Array}
 * @public
 */

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

/**
 * Recipient custom queries
 * - findall
 * - insert (stub)
 * - update
 * - stats (recipients aggregate stats)
 * */

const recipientQueries = {
  // findAll: (filter, ignore=[], schema) => {
  //
  //     /**
  //      * Generate query: Find all filtered records in table.
  //      *
  //      * @param schema
  //      * @param {int} offset
  //      * @param {String} order
  //      * @return {Promise} results
  //      * @public
  //      */
  //
  //         // destructure filter for sort/order/offset/limit
  //     const {orderby = null, order = 'ASC', offset = 0, limit = null} = filter || {};
  //     // (optional) order by attribute
  //     const orderClause = order && orderby ? `ORDER BY recipients.${orderby} ${order}` : '';
  //     const limitClause = limit ? `LIMIT ${limit}` : '';
  //
  //     // get column filters
  //     const [filterStatements, filterValues] = getFilters(filter);
  //     const selections = Object.keys(schema.attributes)
  //         .filter(field => !ignore.includes(field))
  //         .map(field => 'recipients.' + field).join(', ');
  //
  //
  //     return {
  //         sql: `SELECT ${selections}, COUNT(recipients.id) as total_filtered_records
  //               FROM recipients
  //                        LEFT JOIN contacts ON contacts.id = recipients.contact
  //                        LEFT JOIN organizations ON organizations.id = recipients.organization
  //                        LEFT JOIN service_selections ON service_selections.recipient = recipients.id
  //                   ${filterStatements && ' WHERE ' + filterStatements}
  //               GROUP BY recipients.id
  //                            ${orderClause}
  //                                ${limitClause}
  //               OFFSET ${offset};`,
  //         data: filterValues
  //     };
  //
  // },
  findAll: (filter, ignore = [], schema) => {
    /**
     * Generate query: Find all filtered records in table.
     *
     * @param schema
     * @param {int} offset
     * @param {String} order
     * @return {Promise} results
     * @public
     */

    // destructure filter for sort/order/offset/limit
    const {
      orderby = "last_name",
      order = "DESC",
      offset = 0,
      limit = null,
    } = filter || {};
    // (optional) order by attribute
    let orderClause = "";
    if (order && orderby) {
      const table =
        orderby === "first_name" || orderby === "last_name"
          ? "contacts"
          : "recipients";
      orderClause = `ORDER BY ${table}.${orderby} ${order}`;
    }
    const limitClause = limit ? `LIMIT ${limit}` : "";

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
    const serviceFilter =
      serviceFilters.length > 0 ? `WHERE  ${serviceFilters.join(" AND ")}` : "";

    // get column selections
    const selections = Object.keys(schema.attributes)
      .filter((field) => !ignore.includes(field))
      .map((field) => "r." + field)
      .join(", ");

    return {
      sql: `WITH rcps AS (
                SELECT recipients.*, contacts.first_name as first_name, contacts.last_name as last_name FROM recipients
                           LEFT JOIN contacts ON contacts.id = recipients.contact
                           LEFT JOIN organizations ON organizations.id = recipients.organization
                           LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                      ${filterStatements && " WHERE " + filterStatements}
                  GROUP BY recipients.id, contacts.first_name, contacts.last_name
                               ${orderClause} ${limitClause}
                  OFFSET ${offset}
                  )
            SELECT
                ${selections},
                      "org".*,
                      "pcon".*,
                      "scon".*,
                      "srvs".*
                  FROM rcps AS "r"
                           -- Organization details
                           LEFT JOIN (
                      SELECT o.id as organization_id,
                             json_build_object(
                                     'id', o.id,
                                     'name', o.name,
                                     'abbreviation', o.abbreviation,
                                     'previous_service_pins', o.previous_service_pins,
                                     'active', o.active
                                 ) AS organization
                      FROM "organizations" AS "o"
                      GROUP BY organization_id
                  ) AS "org" ON organization_id = "r"."organization"
                      -- Personal contact details
                           LEFT JOIN (
                      SELECT cp.id as contact_id,
                             json_build_object(
                                     'id', cp.id,
                                     'first_name', cp.first_name,
                                     'last_name', cp.last_name,
                                     'office_email', cp.office_email,
                                     'office_phone', cp.office_phone,
                                     'personal_email', cp.personal_email,
                                     'personal_phone', cp.personal_phone,
                                     'personal_address', json_build_object(
                                             'id', cpa.id,
                                             'pobox', cpa.pobox,
                                             'street1', cpa.street1,
                                             'street2', cpa.street2,
                                             'community', cpa.community,
                                             'province', cpa.province,
                                             'country', cpa.country,
                                             'postal_code', cpa.postal_code
                                         ),
                                     'office_address', json_build_object(
                                             'id', coa.id,
                                             'pobox', coa.pobox,
                                             'street1', coa.street1,
                                             'street2', coa.street2,
                                             'community', coa.community,
                                             'province', coa.province,
                                             'country', coa.country,
                                             'postal_code', coa.postal_code
                                         )
                                 ) AS contact
                      FROM "contacts" AS "cp"
                               -- Contact: address details
                               LEFT JOIN "addresses" AS "cpa" ON cpa.id = cp."personal_address"
                               LEFT JOIN "addresses" AS coa ON coa.id = cp."office_address"
                      GROUP BY contact_id, cpa.id, coa.id
                  ) AS "pcon" ON contact_id = "r"."contact"
                      -- Supervisor contact details
                           LEFT JOIN (
                      SELECT cs.id as supervisor_id,
                             json_build_object(
                                     'id', cs.id,
                                     'first_name', cs.first_name,
                                     'last_name', cs.last_name,
                                     'office_email', cs.office_email,
                                     'office_phone', cs.office_phone,
                                     'personal_email', cs.personal_email,
                                     'personal_phone', cs.personal_phone,
                                     'office_address', json_build_object(
                                             'id', coa.id,
                                             'pobox', coa.pobox,
                                             'street1', coa.street1,
                                             'street2', coa.street2,
                                             'community', coa.community,
                                             'province', coa.province,
                                             'country', coa.country,
                                             'postal_code', coa.postal_code
                                         )
                                 ) AS supervisor
                      FROM "contacts" AS "cs"
                               -- Contact: address details
                               LEFT JOIN "addresses" AS coa ON coa.id = cs."office_address"
                      GROUP BY supervisor_id, coa.id
                  ) AS "scon" ON supervisor_id = "r"."supervisor"
                      
                    -- services details
                           LEFT JOIN (
                      SELECT srv.recipient as recipient_id, 
                             JSON_AGG(
                              json_build_object(
                                      'id', srv.id,
                                      'recipient', srv.recipient,
                                      'milestone', srv.milestone,
                                      'qualifying_year', srv.qualifying_year,
                                      'service_years', srv.service_years,
                                      'cycle', srv.cycle,
                                      'previous_registration', srv.previous_registration,
                                      'previous_award', srv.previous_award,
                                      'delegated', srv.delegated,
                                      'confirmed', srv.confirmed,
                                      'ceremony_opt_out', srv.ceremony_opt_out,
                                      'survey_opt_in', srv.survey_opt_in,
                                      'awards', json_build_object(
                                              'id', asel.id,
                                              'award', json_build_object(
                                                      'id', awd.id,
                                                      'short_code', awd.short_code,
                                                      'type', awd.type,
                                                      'milestone', awd.milestone,
                                                      'label', awd.label,
                                                      'description', awd.description,
                                                      'image_url', awd.image_url,
                                                      'quantity', awd.quantity,
                                                      'active', awd.active
                                                  ),
                                              'selections', selections
                                          )
                                  )
                          ) AS services
                      FROM "service_selections" AS "srv"
                               -- Service Selection: award details
                               LEFT JOIN "award_selections" AS asel ON asel.id = srv."id"
                               LEFT JOIN "awards" AS awd ON awd.id = asel."award"
                          -- Service Selection: award option selections
                               LEFT JOIN (
                                  SELECT aoptsel.service as aopt_service_id, JSON_AGG(
                                          json_build_object(
                                                  'service', aoptsel.service,
                                                  'award_option', json_build_object(
                                                          'id', aopt.id,
                                                          'award', aopt.award,
                                                          'type', aopt.type,
                                                          'name', aopt.name,
                                                          'description', aopt.description,
                                                          'label', aopt.label,
                                                          'value', aopt.value,
                                                          'customizable', aopt.customizable
                                                      ),
                                                  'custom_value', aoptsel.custom_value,
                                                  'pecsf_charity', json_build_object(
                                                          'id', pecsf.id,
                                                          'label', pecsf.label,
                                                          'region', pecsf.region,
                                                          'vendor', pecsf.vendor,
                                                          'active', pecsf.active
                                                      )
                                              )
                                      ) AS selections
                                    FROM "award_option_selections" AS "aoptsel"
                                           -- Award Selections: award option details
                                           LEFT JOIN "award_options" AS aopt ON aopt.id = aoptsel."award_option"
                                           LEFT JOIN "pecsf_charities" AS pecsf ON pecsf.id = aoptsel."pecsf_charity"
                                      GROUP BY aopt_service_id
                                  ) AS "aopts" ON aopt_service_id = "srv"."id"
                           -- end award options 
                          -- ${serviceFilter}
                      GROUP BY recipient_id
                  ) AS "srvs" ON recipient_id = "r"."id"
                  ORDER BY ${orderby} ${order}
            ;`,
      data: filterValues,
    };
  },
  count: (filter) => {
    /**
     * Generate query: Count total filtered records in table.
     *
     * @param schema
     * @param {int} offset
     * @param {String} order
     * @return {Promise} results
     * @public
     */

    // get column filters
    const [filterStatements, filterValues] = getFilters(filter);
    return {
      sql: `SELECT COUNT(*) as total_filtered_records
                  FROM recipients
                           LEFT JOIN contacts ON contacts.id = recipients.contact
                           LEFT JOIN organizations ON organizations.id = recipients.organization
                           LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                      ${filterStatements && " WHERE " + filterStatements};`,
      data: filterValues,
    };
  },
  findContact: (id, type) => {
    const contactRef =
      type === "contact" ? "recipients.contact" : "recipients.supervisor";
    return {
      sql: `SELECT contacts.* FROM contacts
                  JOIN recipients ON contacts.id = ${contactRef}
                  WHERE recipients.id = $1::uuid;`,
      data: [id],
    };
  },
  updateContact: (recipientID, contactID, type) => {
    return {
      sql: `UPDATE recipients
                  SET ${type} = $2::uuid
                  WHERE recipients.id = $1::uuid
                  RETURNING *;`,
      data: [recipientID, contactID],
    };
  },
  updateAttendee: (recipientID, attendeeID, type) => {
    return {
      sql: `UPDATE recipients
                  SET ${type} = $2::uuid
                  WHERE recipients.id = $1::uuid
                  RETURNING *;`,
      data: [recipientID, attendeeID],
    };
  },
  insert: (data) => {
    // destructure user stub data
    const {
      id = null,
      guid = null,
      idir = null,
      user = null,
      employee_number = null,
      status = null,
      organization = null,
      contact = null,
      supervisor = null,
    } = data || {};
    return {
      sql: `INSERT INTO recipients (
                id, guid, idir, "user", employee_number, status, organization, contact, supervisor
            )
                  VALUES (
                             $1::uuid,
                             $2::varchar,
                             $3::varchar,
                             $4::uuid,
                             $5::integer,
                             $6::varchar,
                             $7::integer,
                             $8::uuid,
                             $9::uuid
                         )
                  ON CONFLICT DO NOTHING
                  RETURNING *;`,
      data: [
        id,
        guid,
        idir,
        user,
        employee_number,
        status,
        organization,
        contact,
        supervisor,
      ],
    };
  },
  update: (data, schema) => {
    if (!schema.modelName) return null;

    // timestamp fields
    const timestamps = ["updated_at"];

    // filter ignored columns:
    const ignore = ["id", "guid", "idir", "user", "created_at"];
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

    let sql = `        UPDATE recipients
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
      sql: `WITH rcps AS (
                SELECT r.* FROM recipients as r
                        LEFT JOIN contacts ON contacts.id = r.contact
                        LEFT JOIN organizations ON organizations.id = r.organization
                        LEFT JOIN service_selections ON service_selections.recipient = r.id
                    ${filterStatements && " WHERE " + filterStatements}
                GROUP BY r.id
            )
                  SELECT
                      ${selections},
                      "org".name AS organization_name,
                      "org".abbreviation AS organization_abbreviation,
                      "pcon".*,
                      "scon".*,
                      "retrosrvs".retroactive_milestones,
                      "srvs".*
                  FROM rcps AS "r"
                           -- Organization details
                           LEFT JOIN (
                      SELECT o.id as organization_id,
                             o.name, 
                             o.abbreviation
                      FROM "organizations" AS "o"
                      GROUP BY organization_id, o.name, o.abbreviation
                  ) AS "org" ON organization_id = "r"."organization"
                      -- Personal contact details
                           LEFT JOIN (
                      SELECT cp.id as contact_id,
                             cp.first_name,
                             cp.last_name,
                             cp.office_email,
                             cp.office_phone,
                             cp.personal_email,
                             cp.personal_phone,
                             cpa.street1 AS personal_address_street_1,
                             cpa.street2 AS personal_address_street_2,
                             cpa.community AS personal_address_community,
                             cpa.province AS personal_address_province,
                             cpa.country AS personal_address_country,
                             cpa.postal_code AS personal_address_postal_code,
                             coa.street1 AS office_address_street_1,
                             coa.street2 AS office_address_street_2,
                             coa.community AS office_address_community,
                             coa.province AS office_address_province,
                             coa.country AS office_address_country,
                             coa.postal_code AS office_address_postal_code
                      FROM "contacts" AS "cp"
                           -- Contact: address details
                           LEFT JOIN "addresses" AS "cpa" ON cpa.id = cp."personal_address"
                           LEFT JOIN "addresses" AS coa ON coa.id = cp."office_address"
                      GROUP BY contact_id, cpa.id, coa.id
                  ) AS "pcon" ON contact_id = "r"."contact"
                      -- Supervisor contact details
                           LEFT JOIN (
                      SELECT cs.id as supervisor_id,
                             cs.first_name AS supervisor_first_name,
                             cs.last_name AS supervisor_last_name,
                             cs.office_email AS supervisor_office_email,
                             cs.office_phone AS supervisor_office_phone,
                             cs.personal_email AS supervisor_personal_email,
                             cs.personal_phone AS supervisor_personal_phone,
                             coa.pobox AS supervisor_office_address_pobox,
                             coa.street1 AS supervisor_office_address_street1,
                             coa.street2 AS supervisor_office_address_street2,
                             coa.community AS supervisor_office_address_community,
                             coa.province AS supervisor_office_address_province,
                             coa.country AS supervisor_office_address_country,
                             coa.postal_code AS supervisor_office_address_postal_code
                      FROM "contacts" AS "cs"
                               -- Contact: address details
                               LEFT JOIN "addresses" AS coa ON coa.id = cs."office_address"
                      GROUP BY supervisor_id, coa.id
                  ) AS "scon" ON supervisor_id = "r"."supervisor"
                      -- services details
                           LEFT JOIN (
                      SELECT srv.recipient AS recipient_id,
                             srv.milestone AS milestone,
                             srv.qualifying_year AS qualifying_year,
                             srv.service_years AS service_years,
                             srv.cycle AS cycle,
                             srv.previous_registration AS previous_registration,
                             srv.previous_award AS previous_award,
                             srv.delegated AS delegated,
                             srv.confirmed AS confirmed,
                             srv.ceremony_opt_out AS ceremony_opt_out,
                             srv.survey_opt_in AS survey_opt_in,
                             awd.short_code AS award_shortcode,
                             awd.label AS award_label,
                             string_agg(
                                CASE WHEN awdopts.type 
                                    NOT IN ('engraving', 'certificate', 'pecsf-certificate', 'pecsf-charity') 
                                    THEN awdopts.label END, '; '
                                 ) AS award_options,
                            string_agg(
                                CASE WHEN awdopts.type IN ('engraving') THEN awdoptsel.custom_value END, '; '
                                ) AS award_custom_engraving,
                             string_agg(
                                     CASE WHEN awdopts.type IN ('certificate') THEN awdoptsel.custom_value END, '; '
                                 ) AS award_certificate_message,
                             string_agg(
                                     CASE WHEN awdopts.type IN ('pecsf-certificate') THEN awdoptsel.custom_value END, '; '
                                 ) AS pecsf_certificate_message,
                             string_agg(
                                     CASE WHEN awdopts.name IN ('pecsf-charity-1') THEN pecsf.label END, '; '
                                 ) AS pecsf_charity_1,
                             string_agg(
                                     CASE WHEN awdopts.name IN ('pecsf-charity-1') THEN pecsf.region END, '; '
                                 ) AS pecsf_region_1,
                             string_agg(
                                     CASE WHEN awdopts.name IN ('pecsf-charity-2') THEN pecsf.label END, '; '
                                 ) AS pecsf_charity_2,
                             string_agg(
                                     CASE WHEN awdopts.name IN ('pecsf-charity-2') THEN pecsf.region END, '; '
                                 ) AS pecsf_region_2
                      FROM "service_selections" AS "srv"
                               -- Service Selection: award details
                               LEFT JOIN "award_selections" AS asel ON asel.id = srv."id"
                               LEFT JOIN "awards" AS awd ON awd.id = asel."award"
                               LEFT JOIN "award_option_selections" AS awdoptsel ON awdoptsel.service = srv.id
                               LEFT JOIN "award_options" AS awdopts ON awdopts.id = awdoptsel."award_option"
                               LEFT JOIN "pecsf_charities" AS pecsf ON pecsf.id = awdoptsel."pecsf_charity"
                      ${serviceFilter}
                      GROUP BY srv.id, awd.id
                  ) AS "srvs" ON recipient_id = "r"."id"
                    -- retroactive service pins details
                    LEFT JOIN (
                      SELECT retrosrv.recipient AS retro_recipient_id, 
                             string_agg(retrosrv.milestone::varchar(255), ', ') AS retroactive_milestones
                      FROM "service_selections" AS "retrosrv"
                      WHERE retrosrv.cycle != ${currentCycle}
                      GROUP BY retrosrv.recipient
                    ) AS "retrosrvs" ON retro_recipient_id = "r"."id"
            ;`,
      data: filterValues,
    };
  },
  stats: (schema, currentCycle) => {
    if (!schema.modelName) return null;
    return [
      { sql: "SELECT COUNT(*) as total_count FROM recipients;", data: [] },
      {
        sql: `SELECT COUNT(*) as lsa_current_count FROM  recipients
                     LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                     WHERE service_selections.cycle = ${currentCycle} 
                       AND service_selections.milestone IN ( 25, 30, 35, 40, 45, 50, 55)
                       AND service_selections.confirmed IS true;`,
        data: [],
      },
      {
        sql: `SELECT COUNT(*) as lsa_previous_count FROM  recipients
                     LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                     WHERE service_selections.cycle != ${currentCycle} 
                       AND service_selections.milestone IN ( 25, 30, 35, 40, 45, 50, 55);`,
        data: [],
      },
      {
        sql: `SELECT COUNT(*) as service_pins_count FROM recipients
                     LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                     WHERE service_selections.milestone IN ( 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
                       AND service_selections.confirmed IS true;`,
        data: [],
      },
      {
        sql: `SELECT COUNT(*) as retroactive_service_pins_count FROM recipients
                   LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                   WHERE service_selections.milestone IN ( 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
                     AND service_selections.confirmed IS true
                     AND service_selections.cycle < ${currentCycle}
            ;`,
        data: [],
      },
      {
        sql: `SELECT COUNT(*) as other_count FROM recipients
                    LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                    WHERE service_selections.milestone IS NULL;`,
        data: [],
      },
    ];
  },
};
exports.queries = recipientQueries;

/**
 * Generate query: Find filtered results
 *
 * @param {Object} filter
 * @param {Array} ignore
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter, ignore, schema) => {
  // DEBUG SQL
  // console.log(recipientQueries.findAll(filter, ignore, schema))
  return await query(recipientQueries.findAll(filter, ignore, schema));
};
/**
 * Default transactions
 * @public
 */

exports.findById = findById;

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.findContact = async (id, type, schema) => {
  const result = await queryOne(recipientQueries.findContact(id, type));
  return await attachReferences(result, schema);
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
  return await transactionOne([recipientQueries.insert(data)]);
};

/**
 * Generate query: Update recipient record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

const update = async (data, schema) => {
  return await transactionOne([recipientQueries.update(data, schema)]);
};
exports.update = update;

/**
 * Generate query: Update recipient record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.updateContact = async (recipientID, contactID) => {
  return await transactionOne([
    recipientQueries.updateContact(recipientID, contactID),
  ]);
};

exports.updateAttendee = async (recipientID, attendeeID) => {
  return await transactionOne([
    recipientQueries.updateAttendee(recipientID, attendeeID),
  ]);
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
  return await query(
    recipientQueries.report(filter, ignore, currentCycle, schema)
  );
};

/**
 * Generate query: Create delegated recipient records
 *
 * @param {Object} data
 * @param {Object} user
 * @return {Promise} results
 * @public
 */

exports.delegate = async (data, user, cycle, schema) => {
  const { attachments = null } = schema || {};
  const { employees = [], supervisor = {} } = data || {};
  const { office_address = {} } = supervisor || {};
  const q = [];

  console.log(supervisor);

  // ensure supervisor contact info is not empty
  if (
    !supervisor.first_name ||
    !supervisor.last_name ||
    !supervisor.office_email
  )
    return null;

  // DISABLED: Note delegate may not be the employees' supervisor
  // // update delegated user info with supervisor info
  // const {first_name = null, last_name = null, office_email = null} = supervisor || {};
  // await user.save({first_name, last_name, email: office_email, role: 'delegate'});

  // register and save delegated recipient records
  employees.map((recipientData) => {
    const {
      employee_number,
      organization,
      contact,
      service,
      prior_milestones = [],
    } = recipientData || {};

    // generate UUID for recipient
    const recipientID = uuid.v4();
    const contactID = uuid.v4();
    const supervisorID = uuid.v4();
    const addressID = uuid.v4();

    const addressModel =
      attachments.supervisor.model.schema.attachments.office_address.model;

    // save supervisor address info
    q.push(
      defaults.queries.upsert(
        {
          id: addressID,
          pobox: office_address.pobox,
          street1: office_address.street1,
          street2: office_address.street2,
          postal_code: office_address.postal_code,
          community: office_address.community,
          province: office_address.province,
          country: office_address.country,
        },
        addressModel.schema
      )
    );

    // save recipient contact data
    q.push(
      defaults.queries.upsert(
        {
          id: contactID,
          first_name: contact.first_name,
          last_name: contact.last_name,
          office_email: contact.office_email,
        },
        attachments.contact.model.schema
      )
    );

    // save supervisor contact data
    q.push(
      defaults.queries.upsert(
        {
          id: supervisorID,
          first_name: supervisor.first_name,
          last_name: supervisor.last_name,
          office_email: supervisor.office_email,
        },
        attachments.supervisor.model.schema
      )
    );

    // save contact office address data
    q.push(
      defaults.queries.updateAttachment(
        contactID,
        addressID,
        "office_address",
        attachments.contact.model.schema
      )
    );

    // save supervisor address data
    q.push(
      defaults.queries.updateAttachment(
        supervisorID,
        addressID,
        "office_address",
        attachments.contact.model.schema
      )
    );

    // create new recipient record (NOTE: generate UUID for GUID)
    q.push(
      recipientQueries.insert({
        id: recipientID,
        guid: uuid.v4(),
        user: user.id,
        employee_number,
        status: "delegated",
        organization: organization.id,
        contact: contactID,
        supervisor: supervisorID,
      })
    );

    // include current service selection
    q.push(
      queries.upsert(
        {
          id: uuid.v4(),
          recipient: recipientID,
          milestone: service.milestone,
          qualifying_year: service.qualifying_year,
          service_years: service.service_years,
          cycle,
          previous_registration: false,
          previous_award: false,
          delegated: true,
          confirmed: true,
          ceremony_opt_out: true,
          survey_opt_in: false,
          awards: null,
        },
        attachments.service.model.schema
      )
    );

    // include prior services selections (prior milestones)
    // - filter out milestones that conflict with current selection
    (prior_milestones || [])
      .filter((mstone) => mstone !== contact.milestone)
      .map((mstone) => {
        // estimate previous cycle
        const previousCycle =
          parseInt(cycle) - (parseInt(service.milestone) - parseInt(mstone));

        q.push(
          queries.upsert(
            {
              id: uuid.v4(),
              recipient: recipientID,
              milestone: mstone,
              qualifying_year: service.qualifying_year,
              service_years: service.service_years,
              cycle: previousCycle,
              delegated: true,
              previous_registration: false,
              previous_award: false,
              confirmed: true,
              ceremony_opt_out: true,
              survey_opt_in: false,
              awards: null,
            },
            attachments.service.model.schema
          )
        );
      });
  });

  // apply update query
  return await transactionOne(q);
};

/**
 * Generate query: Find result count for filtered query
 *
 * @param {Object} filter
 * @parem {Object} user
 * @return {Promise} results
 * @public
 */

exports.count = async (filter, user, schema) => {
  // console.log(recipientQueries.count(filter, schema))
  return await queryOne(recipientQueries.count(filter, schema));
};

/**
 * Generate query: Get recipients stats
 *
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.stats = async (schema, cycle) => {
  let result = {};
  await Promise.all(
    (recipientQueries.stats(schema, cycle) || []).map(async (q) => {
      const res = await query(q);
      const item = res.length > 0 ? res[0] : null;
      result = { ...result, ...item };
      return item;
    })
  );
  return result;
};

/**
 * Generate query: Delete recipient record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.remove = async (id, schema) => {
  return await defaults.removeByFields(["id"], [id], schema);
};
