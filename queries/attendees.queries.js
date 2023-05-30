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
  report: (filter, ignore = [], schema) => {
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
                SELECT a.* FROM recipients as r
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
};
exports.queries = attendeesQueries;

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

exports.report = async (filter, ignore, schema) => {
  // DEBUG SQL
  // console.log(recipientQueries.report(filter, ignore, currentCycle, schema))
  return await query(attendeesQueries.report(filter, ignore, schema));
};
/**
 * Default transactions
 * @public
 */

exports.findById = findById;
