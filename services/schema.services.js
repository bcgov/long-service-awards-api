/*!
 * Schema services
 * File: schema.services.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

/**
 * Lookup tables for schema options
 *
 */

const schemaData = {
    "status": [
        {value: 'draft', text: 'Draft'},
        {value: 'submitted', text: 'Submitted'}
    ],
    "roles": [
        {value: 'inactive', text: 'Inactive'},
        {value: 'nominator', text: 'Nominator'},
        {value: 'administrator', text: 'Administrator'},
        {value: 'super-administrator', text: 'Super-Administrator'}
    ],
};

/**
 * get enumerated data by key
 * **/

exports.get = (key) => {
    return schemaData[key] !== 'undefined' ? schemaData[key] : null;
}

/**
 * get enumerated data by key
 * **/

exports.lookup = (key, value) => {
    if (schemaData[key] === 'undefined') return null;
    const found = schemaData[key].filter(item => item.value === value);
    return found.length > 0 ? found[0].text : null;
}

/**
 * check if category contains given section
 * **/

exports.checkSection = (section, category) => {
    return schemaData['categories'].filter(cat => {
        return cat.value === category && cat.sections.includes(section);
    }).length > 0;
}

/**
 * check if category exists
 * **/

exports.checkCategory = (category) => {
    return schemaData['categories'].filter(cat => {
        return cat.value === category;
    }).length > 0;
}

