/*!
 * Default model constructor
 * File: constructor.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const { sanitize } = require("../services/validation.services");

'use strict';

/**
 * Default model
 * - Defines basic prototype for model class objects
 *
 * @param {Object} props
 * @return {Array} results
 * @public
 */


// initialize base model instance
exports.ModelConstructor = (props) => {
    const{init=null, schema=null, db=null, attach=async()=>{}} = props || {};
    if (!init) return null;
    const {id=null} = init || {};
    const {modelName=''} = schema || {};

    /**
     * Validate model data
     * - applies cascading validators defined in model
     *
     * @param {Object} data
     * @return {Object} validated data
     * **/

    const validate = function (data) {
        const { attributes=null } = schema || {};
        // apply data validators
        Object.keys(attributes || {})
            .filter(key => attributes[key].hasOwnProperty('validate'))
            .filter(key => attributes[key].validate
                .map(validator => {
                    const datum = data && data.hasOwnProperty(key) ? data[key] : null;
                    const {valid=false, code=''} = validator(datum);
                    // if invalid, throw last validation error
                    if (!valid) {
                        console.error('Validation Error:', key, code, '\nValue:', datum)
                        throw Error(code);
                    }
                })
            );
        return data;
    }

    /**
     * Initialize model input data
     * - maps input data to schema
     *
     * @param {Object} data
     * @return {Object} validated data
     * **/

    const initValues = function (data) {
        const { attributes=null } = schema || {};
        // clean model attribute values
        return validate(Object.keys(attributes || {})
            .reduce((o, attKey) => {
                const { dataType, model, defaultValue } = attributes[attKey];
                // set the attribute value
                // - for model object values, set attribute to ID value
                // - sanitize all values against data type
                o[attKey] = data && data.hasOwnProperty(attKey)
                    ? model
                    && data[attKey]
                    && typeof data[attKey] === 'object'
                    && data[attKey].hasOwnProperty('id')
                        ? sanitize(data[attKey].id, dataType)
                        : sanitize(data[attKey], dataType)
                    : sanitize(defaultValue, dataType);
                return o;
            }, {})
        );
    }

    /**
     * Update model data
     * - maps input data to schema
     *
     * @param {Object} newData
     * @param currentData
     * @return {Object} cleaned data
     * **/

    const updateValues = function (newData, currentData) {
        const { attributes=null } = schema || {};
        // clean model attribute values
        return validate(Object.keys(attributes || {})
            .reduce((o, attKey) => {
                // update any editable model data
                const {dataType='', editable=true, model, defaultValue} = attributes[attKey] || {};
                const currentValue = currentData && currentData.hasOwnProperty(attKey) ? currentData[attKey] : null;
                // set the attribute value
                // - for model object values, set attribute to ID value
                // - sanitize all values against data type
                o[attKey] = editable && newData && newData.hasOwnProperty(attKey)
                    ? model && typeof newData[attKey] === 'object' && newData[attKey].hasOwnProperty('id')
                        ? sanitize(newData[attKey].id, dataType)
                        : sanitize(newData[attKey], dataType)
                    : sanitize(currentValue || defaultValue, dataType);
                return o;
            }, {})
        );
    }

    /**
     * Index model input data for expanded values
     * - creates lookup data for indexed record
     *
     * @param {Object} data
     * @return {Object} indexed data
     * **/

    const indexValues = function (data) {
        const { attributes=null } = schema || {};
        // index model attribute values
        // - only index attributes with attached models
        return Object.keys(attributes || {})
            .filter(attKey => data
                && data.hasOwnProperty(attKey) && typeof data[attKey] === 'object'
                && attributes[attKey].hasOwnProperty('model') && attributes[attKey].model)
            .reduce((o, attKey) => {
                o[attKey] = validate(data[attKey]);
                return o;
            }, {});
    }

    /**
     * Attach model reference data
     * - maps input data to schema
     *
     * @param {Object} data
     * @return {Object} cleaned data
     * **/

    const attachReferences = function (data) {
        const { attachments=null } = schema || {};
        const currentReferences = this.attachments || null;
        return Object.keys(attachments || {})
            .reduce((o, key) => {
                // destructure attachment model and attach function
                const {model=null, attach=null} = attachments[key];
                // for arrayed models, destructure
                const useModel = Array.isArray(model) ? model[0] : model;
                // get current attached data (db reference data)
                // - check if attached model is in an array
                const currentData = Array.isArray(model)
                    ? Object.assign([], currentReferences && currentReferences.hasOwnProperty(key)
                        ? currentReferences[key] : [])
                    : Object.assign({}, currentReferences && currentReferences.hasOwnProperty(key)
                        ? currentReferences[key] : {});
                // get new attached data
                const newData = model && data && data.hasOwnProperty(key) ? data[key] : currentData;
                // attach reference model to current parent
                o[key] = Array.isArray(newData)
                    ? newData.map(itemData => { return useModel.create(itemData, attach) })
                    : useModel.create(newData, attach);
                return o;
            }, {});
    }

    // model properties
    const properties = {
        'model': {
            value: modelName
        },
        'schema': {
            value: schema
        },
        'values': {
            value: initValues(init),
            writable: true
        },
        'attachments': {
            value: attachReferences(init),
            writable: true
        },
        'index': {
            value: indexValues(init),
            writable: true
        }
    }

    const prototype = {
        sync: async function () {
            const syncData = await db.findById(this.id, schema);
            this.values = initValues(syncData);
            this.attachments = attachReferences(syncData);
            this.index = indexValues(syncData);
        },
        save: async function (data=null) {
            // update model values with input values
            await db.update(updateValues(data, this.values), schema);
            // attach updated reference data to instance
            await this.attachMultiple(Object.values(data ? attachReferences(data) : this.attachments));
            // update current model values
            await this.sync();
        },
        attachTo: async function (parent) {
            // attach reference if database attachment method is defined
            const dependent = this;
            // attach to parent model
            await attach(dependent, parent);
            // attach dependent reference models
            const updatedReferences = this.attachments;
            await Promise.all((Object.keys(updatedReferences || {}).map(async(refKey) => {
                Array.isArray(updatedReferences[refKey])
                    ? await this.attachMultiple(updatedReferences[refKey])
                    : await updatedReferences[refKey].attachTo(dependent);
            })));

        },
        attachMultiple: async function (attachments) {
            // attach multiple attachments to current parent
            await Promise.all((attachments || []).map( async (attachment) => {
                Array.isArray(attachment)
                    ? await this.attachMultiple(attachment)
                    : await attachment.attachTo(this);
            }));
        },
        delete: async function () {
            // delete record from database (does not change instance values)
            return await db.remove(id, schema);
        },
    };

    // initialize model instance
    const model = Object.create(prototype, properties);

    // get merged (values + attachments) data
    Object.defineProperty(model, "data", {
        get : function () {
            const refs = this.attachments;
            const vals = this.values;
            const idx = this.index;
            const expandedValues = Object.keys(vals || {}).reduce((o, attKey) => {
                // replace id with indexed data (if exists)
                if (idx && idx.hasOwnProperty(attKey)) o[attKey] = idx[attKey]
                // otherwise, set to value (check if array or single object)
                else o[attKey] = vals[attKey];
                return o;
            }, {});
            return Object.keys(refs || {}).reduce((o, refKey) => {
                const ref = refs[refKey];
                // ignore null attachments
                if (!ref) o[refKey] = null;
                // check if array or single reference(s)
                else o[refKey] = Array.isArray(ref)
                    ? ref.map(refModelItem => { return refModelItem.data })
                    : ref.data;
                return o;
            }, expandedValues);
        }
    });

    // create getters / setters for model attributes
    Object.keys(schema.attributes)
        .forEach(attribute => {
            Object.defineProperty(model, attribute, {
                get() {
                    return this.values[attribute];
                },

                set(value) {
                    this.values[attribute] = value;
                }
            });
        });

    // return initialized model instance
    return init && schema && db ? model : null;
}
