/*!
 * Default SQL queries
 * File: default.queries.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

const {query, queryOne, transactionOne} = require("../db");

/**
 * Default queries
 */

const queries = {
    findByFields: (fields, values, schema, sort) => {

        // (optional) order by attribute
        const {orderby, order} = sort || {};
        const orderClause = order && orderby ? `ORDER BY ${orderby} ${order || 'ASC'}` : '';

        // construct where condition sql
        const where = fields.map((field, index) => {
            return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
        }).join(' AND ');

        return {
            sql: `SELECT *
                  FROM ${schema.modelName}
                  WHERE ${where} 
                  ${orderClause};`,
            data: values,
        };
    },
    findAttachment: (parentID, parentField, parentSchema, dependentSchema)=>{
        return {
            sql: `SELECT ${dependentSchema.modelName}.* FROM ${dependentSchema.modelName} 
                  JOIN ${parentSchema.modelName} 
                      ON ${dependentSchema.modelName}.id = ${parentSchema.modelName}.${parentField}
                  WHERE ${parentSchema.modelName}.id = $1::uuid;`,
            data: [parentID],
        };
    },
    upsert: (data, schema, conflict = ['id']) => {
        // return null if instance is null
        if (!schema.modelName) return null;

        const timestamps = ['updated_at', 'created_at'];
        let offset = 1;

        // generate columns list to upsert
        // - sort conflict fields to front of array
        const columns = Object.keys(schema.attributes)
            .filter(attr => !schema.attributes[attr].serial)
            .sort(function(x, _) {
                return conflict.includes(x) ? -1 : 0;
            });

        // generate values array to insert/upsert
        // - filter serial fields (e.g., serial IDs)
        const values = columns
            .filter(attr => !schema.attributes[attr].serial)
            .map((attr, index) => {
                const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index + offset}`;
                return `${placeholder}::${schema.attributes[attr].dataType}`;
            });

        // define upsert assignments on conflict
        // - filter conflict fields
        // - filter serial fields (e.g., serial IDs)
        // - filter created timestamps
        const conflictAssignments = columns
            .filter(attr => !conflict.includes(attr))
            .filter(attr => !schema.attributes[attr].serial)
            .filter(attr => attr !== 'created_at')
            .map((attr, index) => {
                // handle timestamp placeholders defined in arguments
                // - set assignment index offset to account for conflict fields (ignore them)
                const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index + conflict.length + offset}`;
                // map returns conjoined prepared parameters in order
                return [`"${attr}"`, `${placeholder}::${schema.attributes[attr].dataType}`].join('=');
            });

        // check if any fields remain for update on conflict
        const updateAction = conflictAssignments.length === 0
            ? 'NOTHING'
            : `UPDATE SET ${conflictAssignments.join(', ')}`

        // construct prepared statement (insertion or merge)
        let sql = `
            INSERT INTO ${schema.modelName} ("${columns.join('", "')}") VALUES (${values.join(', ')})
            ON CONFLICT ("${conflict.join('", "')}") DO ${updateAction}
            RETURNING *;`

        // filter input data to match insert parameters
        // - filters: ignored, timestamp, null ID attributes
        // - sort data by conflict fields (put to front of array)
        let filteredData = Object.keys(schema.attributes)
            .filter(attr => !schema.attributes[attr].serial)
            .filter(attr => !timestamps.includes(attr))
            .sort(function(x) {
                return conflict.includes(x) ? -1 : 0;
            })
            .map(attr => {
                return data && data.hasOwnProperty(attr) ? data[attr] : null
            });

        return { sql: sql, data: filteredData }
    },
    updateAttachment: (parentID, dependentID, field, schema)=>{
        return {
            sql: `UPDATE ${schema.modelName}
                  SET ${field} = $2::uuid
                  WHERE ${schema.modelName}.id = $1::uuid
                  RETURNING *;`,
            data: [parentID, dependentID],
        };
    },
    insert: (data, schema, ignore = ['id']) => {

        // return null if instance is null
        if (!schema.modelName) return null;

        // define timestamp columns
        const timestamps = ['created_at', 'updated_at'];

        // generate columns list (filter out non-attributes)
        // - filter ignored fields (e.g., ID)
        // - ignore fields not in model schema
        // - ignore timestamps
        const columns = Object.keys(data)
            .sort()
            .filter(key => !ignore.includes(key))
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
        let sql = `INSERT INTO ${schema.modelName} ("${columns.join('", "')}")
               VALUES (${values.join(',')})
               RETURNING *;`;

        // filter input data to match insert columns
        // filters: ignored, timestamp, ID attributes
        let filteredData = columns
            .filter(key => !ignore.includes(key))
            .map(key => {return data[key]});

        // collate data as value array
        return { sql: sql, data: filteredData };
    },
    update: (data, schema, ignore=['id', 'created_at'], idKey='id') => {

        // return null if input is null
        if (!schema.modelName || !data || Object.keys(data).length === 0) return null;

        // timestamp fields
        const timestamps = ['created_at', 'updated_at'];

        // generate columns list to upsert
        // - sort id field to front of array
        // - filter ignored columns
        const columns = Object.keys(schema.attributes)
            .sort(function(x, _) {
                return idKey === x ? -1 : 0;
            })
            .filter(key => !ignore.includes(key));

        // generate prepared statement value placeholders
        // - NOTE: index shift to account for ID and created datetime values
        let index = 2;
        const assignments = columns.map(attr => {
            // handle timestamp placeholder defined in arguments
            const placeholder = timestamps.includes(attr) ? `NOW()` : `$${index++}`;

            // map returns conjoined prepared parameters in order
            return [attr, `${placeholder}::${schema.attributes[attr].dataType}`].join('=');
        });

        let sql = `UPDATE "${schema.modelName}"
               SET ${assignments.join(',')}
               WHERE "${idKey}" = $1::integer
               RETURNING *;`;

        // init filtered Data
        let filteredData = [data.hasOwnProperty(idKey) ? data[idKey] : null];

        // filter input data to match update parameters
        filteredData.push(...Object.keys(schema.attributes)
            .filter(key => !ignore.includes(key) && !timestamps.includes(key))
            .map(key => {return data[key] == null ? null : data[key]}));

        // collate data as value array
        return { sql: sql, data: filteredData };
    }
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

    // expand attributes that have a data model
    await Promise.all(Object.keys(schema.attributes || {}).map(async (attKey) => {
        const { model=null } = schema.attributes[attKey];
        // find attribute value record for given ID and attach to result
        if (model && result.hasOwnProperty(attKey)) {
            // return item as model instance and expand data
            const item = await model.findById(result[attKey]);
            // data may be returned as either model instance or data object
            const {data} = item || {};
            result[attKey] = data || item;
        }
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
exports.attachReferences = attachReferences;


/**
 * Generate query: Add referenced attachment data to result
 *
 * @param {Object} result
 * @param {Object} schema
 * @param {String} idKey
 * @return {Promise} results
 * @public
 */

const attachQueries = async (result, schema, idKey='id') => {

    if (!result || !schema) return null;
    // get parent ID value from result data
    const parentID = result.hasOwnProperty(idKey) ? result[idKey] : null;

    // expand attributes that have a data model
    await Promise.all(Object.keys(schema.attributes || {}).map(async (attKey) => {
        const { model=null } = schema.attributes[attKey];
        // find attribute value record for given ID and attach to result
        if (model && result.hasOwnProperty(attKey)) {
            // return item as model instance and expand data
            const item = await model.findById(result[attKey]);
            // data may be returned as either model instance or data object
            const {data} = item || {};
            result[attKey] = data || item;
        }
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
exports.attachQueries = attachQueries;

/**
 * Generate query: Find all records in table.
 *
 * @param schema
 * @param {int} offset
 * @param {String} order
 * @return {Promise} results
 * @public
 */

exports.findAll = async (filter, schema) => {
    // destructure filter
    const {orderby = null, order = 'ASC', offset = 0, limit = null} = filter || {};
    // (optional) order by attribute
    const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    // get query results
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

exports.findById = async (id, schema, sort) => {

    // (optional) order by attribute
    const {orderby, order} = sort || {};
    const orderClause = order && orderby ? `ORDER BY ${orderby} ${order || 'ASC'}` : '';

    const {modelName=null} = schema || {};
    const result = await queryOne({
        sql: `
            SELECT * 
            FROM ${modelName} 
            WHERE "id" = $1::${schema.attributes.id.dataType}
            ${orderClause}
        ;`,
        data: [id],
    });
    // attach linked records to results
    return await attachReferences(result, schema);
}

/**
 * Generate query: Get total record count
 *
 * @param id
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

exports.count = async (schema) => {
    const {modelName=null} = schema || {};
    return await queryOne({
        sql: `SELECT COUNT(*) as total_count FROM ${modelName};`,
        data: [],
    });
}


/**
 * Generate query: Find records by field value.
 *
 * @param {String} field
 * @param {any} value
 * @param {Object} schema
 * @param {String} orderby
 * @param {String} order
 * @return {Promise} results
 * @public
 */

exports.findByField = async (field, value, schema, sort) => {

    // (optional) order by attribute
    const {orderby = null, order = 'ASC'} = sort || {};
    const orderClause = order && orderby ? `ORDER BY ${orderby} ${order}` : '';

    const result = await query({
        sql: `SELECT *
              FROM ${schema.modelName}
              WHERE "${field}" = $1::${schema.attributes[field].dataType}
              ${orderClause}
        ;`,
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

exports.findOneByFields = async (fields, values, schema, sort) => {

    // (optional) order by attribute
    const {orderby, order} = sort || {};
    const orderClause = order && orderby ? `ORDER BY ${orderby} ${order || 'ASC'}` : '';

    // construct where condition sql
    const where = fields.map((field, index) => {
        return `"${field}" = $${index + 1}::${schema.attributes[field].dataType}`
    }).join(' AND ');

    const result = await queryOne({
        sql: `SELECT * FROM ${schema.modelName} WHERE ${where} ${orderClause};`,
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
 * Generate query: Find attachment for parent
 *
 * @param {String} parentID
 * @return {Promise} results
 * @public
 */

exports.findAttachment = async (parentID, parentField, parentSchema, dependentSchema) => {
    return await transactionOne([
        queries.findAttachment(parentID, parentField, parentSchema, dependentSchema)
    ]);
}

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
    // console.log(queries.insert(data, schema, ignore))
    return await query(queries.insert(data, schema, ignore));
}

/**
 * Generate query: Upsert new record into database.
 *
 * @param {Object} data
 * @param {Object} schema
 * @param {Array} conflict
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

exports.update = async (data, schema, ignore, idKey) => {
    // console.log('Update Record', queries.update(data, schema, ignore, idKey))
    return await query(queries.update(data, schema, ignore, idKey));
}

/**
 * Generate query: Update attachment record in table.
 *
 * @param {String} parentID
 * @return {Promise} results
 * @public
 */

exports.updateAttachment = async (parentID, dependentID, field, schema) => {
    return await transactionOne([
        queries.updateAttachment(parentID, dependentID, field, schema)
    ]);
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
