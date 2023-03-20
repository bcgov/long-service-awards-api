/*!
 * Recipients SQL queries
 * File: recipients.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

'use strict';

const {transactionOne, query, queryOne} = require("../db");
const uuid = require("uuid");
const {findById, queries, attachReferences } = require("./default.queries");
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
     * */

    const filters = {
        first_name: () => `(contacts.first_name LIKE '%' || $${index++}::varchar || '%')`,
        last_name: () => `(contacts.last_name LIKE '%' || $${index++}::varchar || '%')`,
        employee_number: () => `(recipients.employee_number LIKE '%' || $${index++}::varchar || '%')`,
        organization: (range) => `(organizations.id IN (${
            (range || []).map(() => `$${index++}::integer`).join(',')
        }))`,
        milestones: (range) => `(service_selections.milestone IN (${
            (range || []).map(() => `$${index++}::integer`).join(',')
        }))`,
        cycle: (range) => `(service_selections.cycle IN (${
            (range || []).map(() => `$${index++}::integer`).join(',')
        }))`,
        confirmed: (value) => `(
        service_selections.confirmed = $${index++}::boolean 
        ${value[0] === 'false' ? 'OR service_selections.confirmed IS NULL' : '' } )`,
    }
    // match filter with input data
    let statements = "";
    statements += Object.keys(data)
        .filter(key => filters.hasOwnProperty(key))
        .reduce((o, key)=>{
            // explode comma-separated query array parameters into array
            const datum = !!data[key] && data[key].split(',');
            // ignore null/empty filter values
            if (datum) {
                o.push(filters[key](datum));
                values.push.apply(values, datum);
            }
            return o;
        }, [])
        .join(' AND \n');

    // return filter statements and values
    return [statements, values];
}

/**
 * Recipient custom queries
 * - findall
 * - insert (stub)
 * - update
 * - stats (recipients aggregate stats)
 * */

const recipientQueries = {
    findAll: (filter, schema) => {

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
        const {orderby = null, order = 'ASC', offset = 0, limit = null} = filter || {};
        // (optional) order by attribute
        const orderClause = order && orderby ? `ORDER BY ${schema.modelName}.${orderby} ${order}` : '';
        const limitClause = limit ? `LIMIT ${limit}` : '';

        // get column filters
        const [filterStatements, filterValues] = getFilters(filter);
        const selections = Object.keys(schema.attributes)
            .map(field => schema.modelName + '.' + field).join(', ');

        return {
            sql: `SELECT ${selections}, COUNT(${schema.modelName + '.id'}) as total_filtered_records
                  FROM ${schema.modelName}
                           LEFT JOIN contacts ON contacts.recipient = ${schema.modelName}.id AND contacts.type = 'personal'
                           LEFT JOIN organizations ON organizations.id = ${schema.modelName}.organization
                           LEFT JOIN service_selections ON service_selections.recipient = ${schema.modelName}.id
                      ${filterStatements && ' WHERE ' + filterStatements}
                  GROUP BY ${schema.modelName + '.id'}
                               ${orderClause}
                               ${limitClause}
                  OFFSET ${offset};`,
            data: filterValues,
        };

    },
    count: (filter, schema) => {

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
                  FROM ${schema.modelName}
                           LEFT JOIN contacts ON contacts.recipient = ${schema.modelName}.id AND contacts.type = 'personal'
                           LEFT JOIN organizations ON organizations.id = ${schema.modelName}.organization
                           LEFT JOIN service_selections ON service_selections.recipient = ${schema.modelName}.id
                      ${filterStatements && ' WHERE ' + filterStatements};`,
            data: filterValues,
        };

    },
    insert: (data)=>{
        // destructure user stub data
        const {
            id=null,
            guid=null,
            idir=null,
            user=null,
            employee_number=null,
            status=null,
            organization=null
        } = data || {};
        return {
            sql: `INSERT INTO recipients (id, guid, idir, "user", employee_number, status, organization)
                  VALUES ($1::uuid, $2::varchar, $3::varchar, $4::uuid, $5::integer, $6::varchar, $7::integer)
                  ON CONFLICT DO NOTHING
                  RETURNING *;`,
            data: [id, guid, idir, user, employee_number, status, organization],
        };
    },
    update: (data, schema) => {

        if (!schema.modelName) return null;

        // timestamp fields
        const timestamps = ['updated_at'];

        // filter ignored columns:
        const ignore = ['id', 'guid', 'idir', 'user', 'status', 'created_at'];
        const cols = Object.keys(schema.attributes).filter(key => !ignore.includes(key));

        // generate prepared statement value placeholders
        // - NOTE: index shift to account for ID and created datetime values
        let index = 2;
        const assignments = cols.map(attr => {
            // handle timestamp placeholder defined in arguments
            const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

            // map returns conjoined prepared parameters in order
            return [attr, `${placeholder}::${schema.attributes[attr].dataType}`].join('=');
        });

        let sql = `UPDATE recipients
                   SET ${assignments.join(',')}
                   WHERE id = $1::${schema.attributes.id.dataType}
                   RETURNING *;`;

        // position ID, creation datetime values at front of array
        let filteredData = [data.id];

        // filter input data to match update parameters
        filteredData.push(...Object.keys(schema.attributes)
            .filter(key => !ignore.includes(key) && !timestamps.includes(key))
            .map(key => {
                return data[key]
            }));

        // console.log('UPDATE:', {sql: sql, data: filteredData})

        // apply update query
        return {sql: sql, data: filteredData};
    },

    stats: (schema, currentCycle) => {
        if (!schema.modelName) return null;
        return [
            {sql: 'SELECT COUNT(*) as total_count FROM recipients;', data: []},
            {sql: `SELECT COUNT(*) as lsa_current_count FROM  recipients
                   LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                   WHERE service_selections.cycle = ${currentCycle} AND service_selections.milestone >= 25;`, data: []},
            {sql: `SELECT COUNT(*) as lsa_previous_count FROM  recipients
                   LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                   WHERE service_selections.cycle != ${currentCycle} AND service_selections.milestone >= 25;`, data: []},
            {sql: `SELECT COUNT(*) as service_pins_count FROM recipients
                   LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                   WHERE service_selections.cycle = ${currentCycle} AND service_selections.milestone IS NOT NULL ;`, data: []},
            {sql: `SELECT COUNT(*) as other_count FROM recipients
                   LEFT JOIN service_selections ON service_selections.recipient = recipients.id
                   WHERE service_selections.milestone IS NULL;`, data: []}
        ];
    }
}
exports.queries = recipientQueries;

/**
 * Generate query: Find filtered results
 *
 * @param {Object} data
 * @parem {Object} user
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter, schema) => {
    const result = await query(recipientQueries.findAll(filter, schema));
    // attach linked records to results
    return await Promise.all((result || []).map(async(item) => {
        return await attachReferences(item, schema);
    }));
}

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

exports.insert = async (data) => {
    // generate UUID for recipient
    data.id = uuid.v4();
    return await transactionOne([recipientQueries.insert(data)]);
}

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
}
exports.update = update;

/**
 * Generate query: Create delegated recipient records
 *
 * @param {Object} data
 * @param {Object} user
 * @return {Promise} results
 * @public
 */

exports.delegate = async (data, user, schema) => {

    const { attachments=null } = schema || {};
    const { employees=[], supervisor={} } = data || {};
    const q = [];

    // update delegated user info with supervisor info
    const {first_name = null, last_name = null, office_email = null} = supervisor || {};
    await user.save({first_name, last_name, email: office_email});

    // save supervisor contact data
    supervisor.id = uuid.v4();
    supervisor.type = 'supervisor';
    q.push(queries.upsert(supervisor, attachments.supervisor.model.schema));

    // register and save delegated recipient records
    employees.map( recipientData => {
        const {
            first_name,
            last_name,
            office_email,
            employee_number,
            organization,
            service_years,
            milestone,
            qualifying_year,
            prior_milestones,
        } = recipientData || {};

        // generate UUID for recipient
        const recipientID = uuid.v4();

        // create new recipient record (NOTE: generate UUID for GUID)
        q.push(recipientQueries.insert({
            id: recipientID,
            guid: uuid.v4(),
            user: user.id,
            employee_number,
            status: 'delegated',
            organization
        }));

        // include recipient contact data
        const contact = { id: uuid.v4(), first_name, last_name, office_email};
        contact.type = 'contact';
        q.push(defaults.queries.upsert(contact, attachments.contact.model.schema));

        // include current service selection
        q.push(queries.upsert({
            id: uuid.v4(),
            recipient: recipientID,
            milestone,
            qualifying_year,
            service_years,
            delegated: true,
            awards: null
        }, attachments.service.model.schema));

        // include prior services selections (prior milestones)
        // - filter out milestones that conflict with current selection
        const default_qualifying_year = qualifying_year;
        const default_service_years = service_years;
        (prior_milestones || [])
            .filter(mstone => mstone !== milestone)
            .map(mstone => {
                q.push(queries.upsert({
                    id: uuid.v4(),
                    recipient: recipientID,
                    milestone: mstone,
                    qualifying_year: default_qualifying_year,
                    service_years: default_service_years,
                    delegated: true,
                    awards: null
                }, attachments.service.model.schema));
            });

    });

    // apply update query
    return await transactionOne(q);
}

/**
 * Generate query: Find result count for filtered query
 *
 * @param {Object} filter
 * @parem {Object} user
 * @return {Promise} results
 * @public
 */

exports.count = async (filter, user, schema) => {
    return await queryOne(recipientQueries.count(filter, schema));
}

/**
 * Generate query: Get recipients stats
 *
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.stats = async (schema, cycle) => {
    let result = {};
    await Promise.all((recipientQueries.stats(schema, cycle) || []).map(async(q) => {
        const res = await query(q);
        const item = res.length > 0 ? res[0] : null;
        result = {...result, ...item};
        return item;
    }));
    return result;
}

/**
 * Generate query: Delete recipient record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.remove = async (id, schema) => {
    return await defaults.removeByFields( ['id'], [id], schema)
}