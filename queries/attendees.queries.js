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
    } = filter || {};

    // (optional) order by attribute
    //const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : "";
    const orderClause =
      order && orderby ? `ORDER BY attendees.id ${order}` : "";
    const limitClause = limit ? `LIMIT ${limit}` : "";
    const filters = [];
    
    const WHEREfilter = getFilters(filter);

    // get query results
    return {
      sql: `SELECT attendees.*
              FROM ${schema.modelName} 
              LEFT JOIN  
              ceremonies ON ceremonies.id = attendees.ceremony
              LEFT JOIN recipients ON recipients.id = attendees.recipient
              LEFT JOIN contacts ON contacts.id = recipients.contact
              ${WHEREfilter} 
              ${orderClause} ${limitClause}
              OFFSET ${offset};`,
      data: [],
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
    const filterStatement = getFilters(filter);
    return {
      sql: `SELECT COUNT(*) as total_filtered_records
                  FROM attendees
                  LEFT JOIN ceremonies ON ceremonies.id = attendees.ceremony
                  LEFT JOIN recipients ON recipients.id = attendees.recipient
                  LEFT JOIN contacts ON contacts.id = recipients.contact
                  ${filterStatement};`,
      
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
  findAccommodationsByAttendee: (attendeeID) => {
    const attendeeRef = "attendees.id";
    return {
      sql: `SELECT * FROM accommodation_selections
                JOIN attendees ON accommodation_selections.attendee = ${attendeeRef}
                WHERE attendees.id = $1::uuid;`,
      data: [attendeeID],
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
  // Remove all guests by recipient ID
  removeGuests: (recipientID) => {
    return {
      // attendees.guest denotes if the attendee is a guest
      // guest 0 =  , guest 1 = guest
      sql: `DELETE FROM attendees 
            WHERE attendees.recipient = $1::uuid 
              AND attendees.guest > 0`,
      data: [recipientID],
    };
  },
  // Insert guest by recipient ID
  insertGuest: (recipientID, ceremony, status) => {
    const newAttendeeID = uuid.v4();
    return {
      sql: `INSERT INTO attendees (id, recipient, ceremony, status, guest)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::varchar, 1)
      RETURNING *`,
      data: [newAttendeeID, recipientID, ceremony, status],
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

    return {
      sql: `--Separate CTE/WITH queries to get list of milestones for each recipient, get dietary/accessibility per recipient+guest columns
      WITH milestones_query AS
      (SELECT string_agg(service_selections.milestone::varchar,',' ORDER BY milestone) AS milestones, service_selections.recipient 
       FROM service_selections GROUP BY service_selections.recipient),
      
      accessibility_query AS 
      (SELECT accommodation_selections.accommodation AS accessibility, attendees.recipient 
       FROM accommodation_selections LEFT JOIN attendees ON attendees.id = accommodation_selections.attendee 
       WHERE attendees.guest = 0 AND accommodation = 'accessibility' GROUP BY attendees.recipient, accommodation_selections.accommodation),
      
      accessibility_guest_query AS 
      (SELECT accommodation_selections.accommodation AS accessibility, attendees.recipient 
       FROM accommodation_selections LEFT JOIN attendees ON attendees.id = accommodation_selections.attendee 
       WHERE attendees.guest > 0 AND accommodation = 'accessibility' GROUP BY attendees.recipient, accommodation_selections.accommodation),
      
      dietary_query AS
      (SELECT string_agg(accommodation_selections.accommodation,',') AS accommodations, attendees.recipient 
       FROM accommodation_selections LEFT JOIN attendees ON attendees.id = accommodation_selections.attendee 
       WHERE accommodation != 'accessibility' AND attendees.guest = 0 GROUP BY attendees.recipient, accommodation_selections.attendee),
      
      dietary_guest_query AS
      (SELECT string_agg(accommodation_selections.accommodation,',') AS accommodations, attendees.recipient 
       FROM accommodation_selections LEFT JOIN attendees ON attendees.id = accommodation_selections.attendee 
       WHERE accommodation != 'accessibility' AND attendees.guest > 0 GROUP BY attendees.recipient, accommodation_selections.attendee)
      
      
      --Main query:
      SELECT 
            attendees.id AS "attendee_id",
            outer_recipients.employee_number as "employee_number",
            contacts.first_name,
            contacts.last_name,
            milestones_query.milestones,
            CAST(DATE(ceremonies.datetime) as TEXT) AS "ceremony_date",
            organizations.name AS "ministry",
            outer_recipients.branch,
            attendees.status,
          CASE WHEN (SELECT COUNT(*) FROM attendees AS inner_attendees WHERE inner_attendees.recipient = outer_recipients.id) > 1 THEN 'Yes' ELSE 'No' END "has_guest",
          CASE WHEN accessibility_query.accessibility = 'accessibility' THEN 'Yes' ELSE 'No' END "accessibility",
          CASE WHEN accessibility_guest_query.accessibility = 'accessibility' THEN 'Yes' ELSE 'No' END "guest_accessibility",
          dietary_query.accommodations AS dietary,
          dietary_guest_query.accommodations AS dietary_guest
            FROM attendees
            LEFT JOIN recipients AS outer_recipients ON attendees.recipient = outer_recipients.id
            LEFT JOIN contacts ON outer_recipients.contact = contacts.id
            LEFT JOIN ceremonies ON attendees.ceremony = ceremonies.id
            LEFT JOIN organizations ON outer_recipients.organization = organizations.id
          LEFT JOIN milestones_query on attendees.recipient = milestones_query.recipient
          LEFT JOIN accessibility_query ON attendees.recipient = accessibility_query.recipient
          LEFT JOIN accessibility_guest_query ON attendees.recipient = accessibility_guest_query.recipient
          LEFT JOIN dietary_query ON attendees.recipient = dietary_query.recipient
          LEFT JOIN dietary_guest_query ON attendees.recipient = dietary_query.recipient
          WHERE attendees.guest = 0
            GROUP BY attendees.recipient, attendee_id, employee_number, first_name, last_name, milestones, 
          ceremony_date, ministry, branch, attendees.status, accessibility_query.recipient, outer_recipients.id, 
          dietary_query.accommodations, dietary_guest_query.accommodations, accessibility_query.accessibility, accessibility_guest_query.accessibility`,
    };
  },
};
exports.queries = attendeesQueries;

const getFilters = (filter) => {
  let filters = [];
  if (filter.hasOwnProperty("first_name") && filter.first_name)
      filters.push(
        `LOWER(contacts.first_name) = LOWER('${filter.first_name}')`
      );
    if (filter.hasOwnProperty("last_name") && filter.last_name)
      filters.push(`LOWER(contacts.last_name) = LOWER('${filter.last_name}')`);
    if (filter.hasOwnProperty("ceremony") && filter.ceremony)
      filters.push(`attendees.ceremony = '${filter.ceremony}'`);
    if (filter.hasOwnProperty("guest") && filter.guest)
      filters.push(`attendees.guest = '${filter.guest}'`);
    if (filter.hasOwnProperty("status") && filter.status) {
      //Multi-select field - create their own OR clause
      const statuses = filter.status.split(",");
      const statusFilters = [];
      statuses.forEach((element) => {
        statusFilters.push(`attendees.status = '${element}'`);
      });
      const statusClause =
        statusFilters.length > 0 ? `(${statusFilters.join(" OR ")})` : "";
      filters.push(statusClause);
    }
    if (filter.hasOwnProperty("organization") && filter.organization) {
      //Multi-select field - create their own OR clause
      const orgs = filter.organization.split(",");
      const orgFilters = [];
      orgs.forEach((element) => {
        orgFilters.push(`recipients.organization = '${element}'`);
      });
      const organizationClause =
        orgFilters.length > 0 ? `(${orgFilters.join(" OR ")})` : "";
      filters.push(organizationClause);
    }
    return filters.length > 0 ? `WHERE  ${filters.join(" AND ")}` : "";
};

exports.findAll = async (filter, schema) => {
  const result = await query(attendeesQueries.findAll(filter, schema));

  // attach linked records to results
  return await Promise.all(
    (result || []).map(async (item) => {
      return await attachReferences(item, schema);
    })
  );
};

exports.count = async (filter, user, schema) => {
  // console.log(recipientQueries.count(filter, schema))
  return await queryOne(attendeesQueries.count(filter, schema));
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

exports.findAccommodationsByAttendee = async (id, schema) => {
  const result = await query(attendeesQueries.findAccommodationsByAttendee(id));
  return await result;
};

exports.update = async (data) => {
  return await transactionOne([attendeesQueries.update(data)]);
};

exports.removeGuests = async (recipientID) => {
  return await transactionOne([attendeesQueries.removeGuests(recipientID)]);
};

exports.insertGuest = async (recipientID, ceremony, status) => {
  return await transactionOne([
    attendeesQueries.insertGuest(recipientID, ceremony, status),
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
    attendeesQueries.report(filter, ignore, currentCycle, schema)
  );
};
/**
 * Default transactions
 * @public
 */

exports.findById = findById;
