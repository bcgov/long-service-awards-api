/*!
 * Default SQL queries
 * File: default.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {query, queryOne, transactionOne} = require("../db");

/**
 * Database rows limit.
 */

// const limit = 50;

/**
 * Default queries
 */

const queries = {
    findByFields: (fields, values, schema) => {
        // construct where condition sql
        const where = fields.map((field, index) => {
            return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
        }).join(' AND ');

        return {
            sql: `SELECT *
                  FROM ${schema.modelName}
                  WHERE ${where};`,
            data: values,
        };
    },
    upsert: (data, schema, conflict = ['id']) => {
        // return null if instance is null
        if (!schema.modelName) return null;

        const timestamps = ['created_at', 'updated_at'];
        let offset = 1;

        // generate columns list to upsert
        // - sort conflict fields to front of array
        const columns = Object.keys(schema.attributes)
            .filter(key => !timestamps.includes(key))
            .sort(function(x, y) {
                return conflict.includes(x) ? -1 : 0;
            });

        // generate values array to insert/upsert
        const values = columns
            .map((attr, index) => {
                // handle serial identifiers
                if (attr === 'id' && schema.attributes[attr].dataType === 'integer') {
                    offset = 0;
                    return 'DEFAULT'
                }
                const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index + offset}`;
                return `${placeholder}::${schema.attributes[attr].dataType}`;
            });

        // define upsert assignments on conflict
        const conflictAssignments = columns
            .filter(attr => !conflict.includes(attr))
            .map((attr, index) => {
                // handle timestamp placeholders defined in arguments
                // - set assignment index offset to account for conflict fields (ignore them)
                const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index + conflict.length + offset}`;
                // map returns conjoined prepared parameters in order
                return [`"${attr}"`, `${placeholder}::${schema.attributes[attr].dataType}`].join('=');
            });

        // construct prepared statement (insertion or merge)
        let sql = `
            INSERT INTO ${schema.modelName} ("${columns.join('", "')}") VALUES (${values.join(', ')})
            ON CONFLICT ("${conflict.join('", "')}") DO UPDATE SET ${conflictAssignments.join(', ')}
            RETURNING *;`

        // filter input data to match insert parameters
        // - filters: ignored, timestamp, null ID attributes
        // - sort data by conflict fields (put to front of array)
        let filteredData = Object.keys(schema.attributes)
            .filter(attr => !(attr === 'id' && schema.attributes[attr].dataType === 'integer'))
            .filter(attr => !timestamps.includes(attr))
            .sort(function(x) {
                return conflict.includes(x) ? -1 : 0;
            })
            .map(attr => {
                return data && data.hasOwnProperty(attr) ? data[attr] : null
            });

        return { sql: sql, data: filteredData }
    },
    insert: (data, schema, ignore = ['id']) => {

        const timestamps = ['created_at', 'updated_at'];

        // return null if instance is null
        if (!schema.modelName) return null;

        // generate columns list (filter out non-attributes)
        const columns = Object.keys(data)
            .filter(attr => schema.attributes.hasOwnProperty(attr))
            .filter(attr => !timestamps.includes(attr));

        // generate value assignments
        let index = 1;
        const values = columns
            .filter(attr => schema.attributes.hasOwnProperty(attr))
            .map(attr => {
                const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;
                return `${placeholder}::${schema.attributes[attr].dataType}`;
            });

        // construct prepared statement (insertion or merge)
        let sql = `INSERT INTO ${schema.modelName} (${columns.join(',')})
               VALUES (${values.join(',')})
               RETURNING *;`;

        // filter input data to match insert parameters
        // filters: ignored, timestamp, ID attributes
        let filteredData = Object.keys(schema.attributes)
            .filter(key => !ignore.includes(key) && !timestamps.includes(key))
            .map(key => {return data[key]});

        // collate data as value array
        return { sql: sql, data: [filteredData] };
    },
    update: (data, schema, ignore=['id', 'created_at'], idKey='id') => {

        // return null if input is null
        if (!schema.modelName || !data || Object.keys(data).length === 0) return null;

        // timestamp fields
        const timestamps = ['created_at', 'updated_at'];

        // filter ignored columns:
        const cols = Object.keys(schema.attributes).filter(key => !ignore.includes(key));

        // generate prepared statement value placeholders
        // - NOTE: index shift to account for ID and created datetime values
        let index = ignore.length;
        const assignments = cols.map(attr => {
            // handle timestamp placeholder defined in arguments
            const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

            // map returns conjoined prepared parameters in order
            return [attr, `${placeholder}::${schema.attributes[attr].type}`].join('=');
        });

        let sql = `UPDATE "${schema.modelName}"
               SET ${assignments.join(',')}
               WHERE ${idKey} = $1::integer
               RETURNING *;`;

        // position ID, creation datetime values at front of array
        let filteredData = [data.id];

        // filter input data to match update parameters
        filteredData.push(...Object.keys(schema.attributes)
            .filter(key => !ignore.includes(key) && !timestamps.includes(key))
            .map(key => {return data[key]}));

        // collate data as value array
        return { sql: sql, data: [filteredData] };
    },
    // prune: (parent, dependent) => {
    //     if (!parent || !parent.hasOwnProperty('model') || !dependent || !dependent.hasOwnProperty('model'))
    //         return null;
    //     // construct prepared statement (deletion)
    //     const sql = `
    //         WITH (SELECT * FROM ${parent.model}_${dependent.model}
    //         WHERE ${parent.model}=$1::uuid AND ${dependent.model}=$2::uuid;) AS associations,
    //         DELETE FROM ${dependent.model}
    //         WHERE (SELECT ${parent.model}=NULL AND ${dependent.model}=$2::uuid;`
    //
    //     return {sql, data: [parent.id, dependent.id]};
    // }
}
exports.queries = queries;

/**
 * Generate query: Add referenced attachment data to result
 *
 * @param {Object} result
 * @param {Object} schema
 * @param {String} idKey
 * @return {Promise} results
 * @public
 */

const attachReferences = async (result, schema, idKey='id') => {

    if (!result || !schema) return null;
    // get parent ID value from result data
    const parentID = result.hasOwnProperty(idKey) ? result[idKey] : null;

    // expand attribute data
    await Promise.all(Object.keys(schema.attributes || {}).map(async (attKey) => {
        const { model=null } = schema.attributes[attKey];
        // find attribute value record for given ID and attach to result
        if (model && result.hasOwnProperty(attKey)) result[attKey] = await model.findById(result[attKey]);
    }));

    // attach reference data
    await Promise.all(Object.keys(schema.attachments || {}).map(async (refKey) => {
        const refData = await schema.attachments[refKey].get(parentID);
        // check if reference data is an array or single model instance
        if (refData) result[refKey] = Array.isArray(refData)
            ? refData.map(refDataItem => { return refDataItem.data })
            : refData.data;
    }));

    return result;
}

/**
 * Generate query: Find all records in table.
 *
 * @param schema
 * @param {int} offset
 * @param {String} order
 * @return {Promise} results
 * @public
 */

exports.findAll = async (orderby=null, order=null, limit=null, offset = 0, schema) => {
    // (optional) order by attribute
    const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const result = await query({
        sql: `SELECT *
              FROM ${schema.modelName} ${orderClause} ${limitClause}
              OFFSET ${offset};`,
        data: [],
    });

    // attach linked records to results
    return await Promise.all((result || []).map(async(item) => {
        return await attachReferences(item, schema);
    }));
}

/**
 * Generate query: Find record by ID.
 *
 * @param id
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findById = async (id, schema) => {
    const {modelName=null} = schema || {};
    const result = await queryOne({
        sql: `SELECT * FROM ${modelName} WHERE "id" = $1::${schema.attributes.id.dataType};`,
        data: [id],
    });
    // attach linked records to results
    return await attachReferences(result, schema);
}


/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findByField = async (field, value, schema) => {
    const result = await query({
        sql: `SELECT *
              FROM ${schema.modelName}
              WHERE "${field}" = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });

    // attach linked records to results
    return await Promise.all((result || []).map( async(item) => {
        return await attachReferences(item, schema);
    }));
};

/**
 * Generate query: Find records by multiple field values.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findOneByFields = async (fields, values, schema) => {
    // construct where condition sql
    const where = fields.map((field, index) => {
        return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
    }).join(' AND ');

    const result = await queryOne({
        sql: `SELECT * FROM ${schema.modelName} WHERE ${where};`,
        data: values,
    });

    return await attachReferences(result, schema);
};

/**
 * Generate query: Find records by multiple field values.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findByFields = async (fields, values, schema) => {
    const result = await query(queries.findByFields(fields, values, schema));

    // attach linked records to results
    return await Promise.all((result || []).map( async(item) => {
        return await attachReferences(item, schema);
    }));
};

/**
 * Generate query: Find single record by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.findOneByField = async (field, value, schema) => {

    const result = await queryOne({
        sql: `SELECT * FROM ${schema.modelName}
              WHERE ${schema.modelName}.${field} = $1::${schema.attributes[field].dataType};`,
        data: [value],
    });
    return await attachReferences(result, schema);

};

/**
 * Generate query: Insert new record into database.
 *
 * @param {Object} data
 * @param {Object} schema
 * @param {Array} ignore
 * @return {Promise} results
 * @public
 */

exports.insert = async (data, schema, ignore = ['id']) => {
    await query(queries.insert(data, schema, ignore));
}

/**
 * Generate query: Upsert new record into database.
 *
 * @param {Object} data
 * @param {Object} schema
 * @param {Boolean} upsert
 * @return {Promise} results
 * @public
 */

exports.upsert = async(data, schema, conflict=['id']) => {
    return await queryOne(queries.upsert(data, schema, conflict));
}

/**
 * Generate query: Update record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.update = async (data, schema, ignore=['id', 'created_at'], idKey='id') => {
    return await query(queries.update(data, schema, ignore, idKey));
}

/**
 * Generate query: Attach references to data object.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.attach = async (data, schema, idKey='id') => {
    return await attachReferences(data, schema, idKey);
}

/**
 * Generate query: Perform db transaction
 *
 * @param {Array} inputQueries
 * @return {Promise} results
 * @public
 */

exports.transact = async (inputQueries) => {
    return await transactionOne(inputQueries);
}

/**
 * Generate query: Delete record from table selected by input fields.
 *
 * @param {Array} fields
 * @param {Array} values
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.removeByFields = async(fields, values, schema) => {

    // construct where condition sql
    const where = fields.map((field, index) => {
        return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
    }).join(' AND ');

    return await queryOne({
        sql: `DELETE FROM ${schema.modelName} WHERE ${where};`,
        data: values,
    });
}

/**
 * Generate query: Delete record from table selected by id.
 *
 * @param {Array} id
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.remove = async(id, schema) => {
    return await queryOne({
        sql: `DELETE FROM ${schema.modelName} WHERE id = $1::${schema.attributes['id'].dataType};`,
        data: [id],
    });
}

/**
 * Generate query: Delete all records from table.
 *
 * @param schema
 * @return {Promise} results
 * @public
 */

exports.removeAll = async(schema) => {
    await query({
        sql: `DELETE FROM ${schema.modelName} RETURNING *;`,
        data: [],
    });
}
