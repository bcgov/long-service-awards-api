/*!
 * Base model constructor
 * File: constructor.model.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const { sanitize } = require("../services/validation.services");

("use strict");

/**
 * Base model prototype constructor
 * - instantiates model class objects
 * - props{init}: initialization data
 * - props{schema}: model schema
 * - props{db}: database methods
 * - props{attach}: model attachments method
 *
 * @param {Object} props
 * @return {Object} model instance
 * @public
 */

// initialize base model instance
exports.ModelConstructor = (props) => {
  const {
    init = null,
    schema = null,
    db = null,
    attach = async () => {},
  } = props || {};
  if (!init) return null;
  const { id = null } = init || {};
  const { modelName = "" } = schema || {};

  /**
   * Validate model data
   * - applies cascading validators defined in model
   *
   * @param {Object} data
   * @return {Object} validated data
   * **/

  const validate = function (data) {
    const { attributes = null } = schema || {};
    // apply data validators
    Object.keys(attributes || {})
      .filter((key) => attributes[key].hasOwnProperty("validators"))
      .filter((key) =>
        attributes[key].validators.map((validator) => {
          const datum = data && data.hasOwnProperty(key) ? data[key] : null;
          const { valid = false, code = "" } = validator(datum);
          // if invalid, throw last validation error
          if (!valid) {
            console.error("Validation Error:", key, code, "\nValue:", datum);
            throw Error(code);
          }
        })
      );
    return data;
  };

  /**
   * Initialize model input data
   * - maps input data to schema
   *
   * @param {Object} data
   * @return {Object} validated data
   * **/

  const initValues = function (data) {
    const { attributes = null } = schema || {};
    // clean model attribute values
    return validate(
      Object.keys(attributes || {}).reduce((o, attKey) => {
        const { dataType, model, defaultValue } = attributes[attKey];
        // set the attribute value
        // - for model object values, set attribute to ID value
        // - sanitize all values against data type
        o[attKey] =
          data && data.hasOwnProperty(attKey)
            ? model &&
              data[attKey] &&
              typeof data[attKey] === "object" &&
              data[attKey].hasOwnProperty("id")
              ? sanitize(data[attKey].id, dataType)
              : sanitize(data[attKey], dataType)
            : sanitize(defaultValue, dataType);
        return o;
      }, {})
    );
  };

  /**
   * Update model data
   * - maps input data to schema
   *
   * @param {Object} newData
   * @param currentData
   * @return {Object} cleaned data
   * **/

  const updateValues = function (newData, currentData) {
    const { attributes = null } = schema || {};
    // clean model attribute values
    return validate(
      Object.keys(attributes || {}).reduce((o, attKey) => {
        // update any editable model data
        const {
          dataType = "",
          editable = true,
          model,
          defaultValue,
        } = attributes[attKey] || {};
        const currentValue =
          currentData && currentData.hasOwnProperty(attKey)
            ? currentData[attKey]
            : null;

        // find primary key attribute
        const primaryKey =
          (model &&
            Object.keys(model.schema.attributes || []).find(
              (attKey) => model.schema.attributes[attKey].primary
            )) ||
          "id";

        // set the attribute value
        // - for model object values, set attribute to index key value (default: 'id')
        // - sanitize all values against data type
        o[attKey] =
          editable && newData && newData.hasOwnProperty(attKey)
            ? model &&
              newData[attKey] &&
              typeof newData[attKey] === "object" &&
              newData[attKey].hasOwnProperty(primaryKey)
              ? sanitize(newData[attKey][primaryKey], dataType)
              : sanitize(newData[attKey], dataType)
            : sanitize(currentValue || defaultValue, dataType);
        return o;
      }, {})
    );
  };

  /**
   * Index model input data for expanded values
   * - creates lookup index for referenced model data (e.g., organization details attached to a user record)
   *
   * @param {Object} indexData
   * @return {Object} indexed data
   * **/

  const indexValues = function (indexData) {
    const { attributes = null } = schema || {};
    // index model attribute values
    // - only index attributes with attached models

    return Object.keys(attributes || {})
      .filter(
        (attKey) =>
          indexData &&
          indexData.hasOwnProperty(attKey) &&
          typeof indexData[attKey] === "object" &&
          attributes[attKey].hasOwnProperty("model") &&
          attributes[attKey].model
      )
      .reduce((o, attKey) => {
        const { data } = indexData[attKey] || {};
        o[attKey] = validate(data || indexData[attKey]);
        return o;
      }, {});
  };

  /**
   * Attach model reference data
   * - maps input data to schema
   *
   * @param {Object} data
   * @return {Object} cleaned data
   * **/

  const attachReferences = function (data) {
    const { attachments = null } = schema || {};
    const currentReferences = this.attachments || null;
    // Update model instance attachments (attached model data)
    // - filter out attachments not in new data
    // - for the remaining attachments, overwrite with new data
    return Object.keys(attachments || {})
      .filter((atchKey) => data && data.hasOwnProperty(atchKey))
      .reduce((o, atchKey) => {
        // destructure attachment model and attach function
        const { model = null, attach = null } = attachments[atchKey];
        // for arrayed models, destructure
        const useModel = Array.isArray(model) ? model[0] : model;
        // get current attached data (db reference data)
        // - check if attached model is in an array
        const currentData = Array.isArray(model)
          ? Object.assign(
              [],
              currentReferences && currentReferences.hasOwnProperty(atchKey)
                ? currentReferences[atchKey]
                : []
            )
          : Object.assign(
              {},
              currentReferences && currentReferences.hasOwnProperty(atchKey)
                ? currentReferences[atchKey]
                : {}
            );
        // get new attached data
        const newData = model ? data[atchKey] : currentData;
        // attach reference model to current parent
        o[atchKey] = Array.isArray(newData)
          ? newData.map((itemData) => {
              return useModel.create(itemData, attach);
            })
          : useModel.create(newData, attach);
        return o;
      }, {});
  };

  // model properties
  const properties = {
    model: {
      value: modelName,
    },
    schema: {
      value: schema,
    },
    values: {
      value: initValues(init),
      writable: true,
    },
    attachments: {
      value: attachReferences(init),
      writable: true,
    },
    index: {
      value: indexValues(init),
      writable: true,
    },
  };

  console.log(properties);

  const prototype = {
    sync: async function () {
      const syncData = await db.findById(this.id, schema);
      this.values = initValues(syncData);
      this.attachments = attachReferences(syncData);
      this.index = indexValues(syncData);
    },
    save: async function (data = null) {
      // update database record with parameter values or stored values
      (await data)
        ? db.update(updateValues(data, this.values), schema)
        : db.update(this.values, schema);
      // attach updated reference data to instance
      await this.attachMultiple(
        Object.values(data ? attachReferences(data) : this.attachments)
      );
      // update current model values
      await this.sync();
    },
    attachTo: async function (parent) {
      // attach reference if database attachment method is defined
      const dependent = this;
      // attach to parent model (if attach method exists)
      if (!!attach) await attach(dependent, parent);
      // attach dependent reference models
      const updatedReferences = this.attachments;
      await Promise.all(
        Object.keys(updatedReferences || {}).map(async (refKey) => {
          if (!updatedReferences[refKey]) return;
          Array.isArray(updatedReferences[refKey])
            ? await this.attachMultiple(updatedReferences[refKey])
            : await updatedReferences[refKey].attachTo(dependent);
        })
      );
    },
    attachMultiple: async function (attachments) {
      // attach multiple attachments to current parent
      await Promise.all(
        (attachments || []).map(async (attachment) => {
          // ignore null attachments
          if (!attachment) return;
          Array.isArray(attachment)
            ? await this.attachMultiple(attachment)
            : await attachment.attachTo(this);
        })
      );
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
    get: function () {
      const attached = this.attachments;
      const vals = this.values;
      const idx = this.index;
      // expand on referenced attributes
      const expandedValues = Object.keys(vals || {}).reduce((o, attKey) => {
        // replace id with indexed data (if exists)
        if (idx && idx.hasOwnProperty(attKey)) o[attKey] = idx[attKey];
        // otherwise, set to value (check if array or single object)
        else o[attKey] = vals[attKey];
        return o;
      }, {});
      // include attached model data
      return Object.keys(attached || {}).reduce((o, atchKey) => {
        const ref = attached[atchKey];
        // ignore null attachments
        if (!ref) o[atchKey] = null;
        // check if array or single reference(s)
        else
          o[atchKey] = Array.isArray(ref)
            ? ref.map((refModelItem) => {
                return refModelItem.data;
              })
            : ref.data;
        return o;
      }, expandedValues);
    },
  });

  // create getters / setters for model attributes
  Object.keys(schema.attributes).forEach((attribute) => {
    Object.defineProperty(model, attribute, {
      get() {
        return this.values[attribute];
      },
      set(value) {
        this.values[attribute] = value;
      },
    });
  });

  // return initialized model instance
  return init && schema && db ? model : null;
};
