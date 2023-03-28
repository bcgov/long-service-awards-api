/*!
 * Data validation services/utilities
 * File: validation.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

/**
 * Regular expression patterns for validation checks
 * **/

const matchers = {
    employeeNumber: /^\d{6}$/i,
    govEmail: /^[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}$/i,
    email: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    phone: /^(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/,
    postal_code: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
    guid: /^[0-9a-fA-F]{8}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{12}$/,
    alphanumeric: /^[a-z0-9]+$/i
}

/**
 * Check if object is empty
 * - ignores filtered fields in input
 * - note recursion
 * **/

const isEmpty = (obj, ignore=[]) => {
    if (typeof obj !== 'object') return !obj;
    return Object.keys(obj || {})
        .filter(key => !isEmpty(obj[key]) && !ignore.includes(key)).length === 0;
};

/**
 * Utility to remove null property values from objects
 * - ignores filtered fields in input
 * - note recursion
 * **/

const removeNull = (obj, ignore=[]) => {
    // ignore non-objects and arrays
    if (Array.isArray(obj) || typeof obj !== 'object') return obj;
    // remove null values from nested objects
    return Object.keys(obj || {})
        .reduce((o, key) => {
            // console.log(key, obj[key], obj[key] === {})
            if (obj[key] !== null && obj[key] !== undefined && obj[key] !== {} && obj[key] !== '')
                o[key] = removeNull(obj[key]);
            return o;
        }, {});
};

/**
 * convert timestamp to JS standard Date class
 *
 * @param date
 * @return {Promise} [error, response]
 */

const convertDate = (date) => {
    // parse single date stored in UTC needed on frontend
    return date ? new Date(date.replace(' ', 'T')) : null;
}


/**
 * Validate required data
 * **/

const validateRequired = (data) => {
    return {
        valid: !!data && !!String(data),
        code: 'missingRequired'
    }
};

/**
 * Validate email address
 * Reference: https://stackoverflow.com/a/46181 (Retrieved Jan 18, 2022)
 * **/

const validateEmail = (email) => {
    return {
        valid: !email || !!String(email)
            .toLowerCase()
            .match(matchers.email),
        code: 'invalidEmail'
    }
};

/**
 * Validate GUID (UUID) value
 * Reference: https://stackoverflow.com/a/46181 (Retrieved Jan 18, 2022)
 * **/

const validateGUID = (guid) => {
    // return {
    //     valid: !!String(guid)
    //         .match(patterns.guid),
    //     code: 'invalidGUID'
    // }
    return {
        valid: true,
        code: 'invalidGUID'
    }
};

/**
 * Validate employee number
 * **/

const validateEmployeeNumber = (data) => {
    return {
        valid: !data || !!String(data).match(matchers.employeeNumber),
        code: 'invalidEmployeeNumber'
    };
}

/**
 * Validate phone number
 * Reference: https://stackoverflow.com/a/29767609 (Retrieved Jan 25, 2022)
 * Valid formats:
 (123) 456-7890
 (123)456-7890
 123-456-7890
 123.456.7890
 1234567890
 +31636363634
 075-63546725
 * **/

const validatePhone = (phone) => {
    return {
        valid: !phone || !!String(phone)
            .toLowerCase()
            .match(matchers.phone),
        code: 'invalidPhone'
    };
};

/**
 * Validates string as alphanumeric
 * **/

const validateAlphaNumeric = (str) => {
    return !!String(str)
        .toLowerCase()
        .match(matchers.alphanumeric);
}

/**
 * Validates Canadian postal code
 * Reference: https://stackoverflow.com/a/46761018
 * ### ###
 * **/

const validatePostcode = (postalcode) => {
    return {
        valid: !postalcode || !!String(postalcode)
            .toLowerCase()
            .match(
                /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i
            ),
        code: 'invalidPostalCode'
    }
};

/**
 * Sanitize data by PostGreSQL data type. Note for composite
 * user-defined types (i.e. coord, camera_settings, dims) the
 * data array is converted to a string representation of its tuple.
 * Empty strings are converted to NULL to trigger postgres non-empty
 * constraints.
 *
 * @param data
 * @param {String} datatype
 * @return {Object} cleanData
 * @src public
 */

const sanitize = (data, datatype) => {
    const sanitizers = {
        'boolean': function() {
            return !!data;
        },
        'varchar': function() {
            // Replaces HTML tags with null string.
            return data ? data.toString().replace( /(<([^>]+)>)/ig, '') : null;
        },
        'integer': function() {
            return isNaN(parseInt(data)) ? null : parseInt(data);
        },
        'double': function() {
            return isNaN(parseFloat(data)) ? null : parseFloat(data);
        },
        'float': function() {
            return isNaN(parseFloat(data)) ? null : parseFloat(data);
        },
        'text': function() {
            // Replaces undesirable HTML tags with null string.
            // - exceptions: <p>, <ul>, <ol>, <b>, <li>, <br>
            return data ? data.toString().replace(
                /(<((?!\/?p|\/?b|\/?ul|\/?ol|\/?li|br\s).)*?>)/ig, '') : '';
        },
        'timestamp': function() {
            // convert timestamp to locale string
            return data===null || data==='' ? null : data;
        },
        default: function() {
            return data === '' ? null : data;
        },
    };
    return (sanitizers[datatype] || sanitizers.default)();
}

/**
 * confirm required input data against model schema
 * **/

const confirm = (schema, data) => {

    // check completeness of model data
    const isComplate = data && Object.entries(schema.attributes || {})
        .filter(([_, field]) => field.hasOwnProperty('required') && field.required)
        .every(([key, field]) => {
            // check if required field has data
            const {valid} = validateRequired(data && data.hasOwnProperty(key) ? data[key] : null);
            return valid;
        });
    // check completeness of model attachment data
    const hasCompleteAttachments = data && Object.entries(schema.attachments || [])
        .filter(([_, attachment]) => attachment.hasOwnProperty('required') && attachment.required)
        .every(([key, {model}]) => confirm(
            model.schema,
            data && data.hasOwnProperty(key) ? data[key] : null)
        );
    return isComplate && hasCompleteAttachments;
}

module.exports = {
    matchers,
    isEmpty,
    removeNull,
    confirm,
    convertDate,
    sanitize,
    validateRequired,
    validateEmployeeNumber,
    validateGUID,
    validateEmail,
    validatePhone,
    validatePostcode
}
