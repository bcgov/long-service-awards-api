/*!
 * Utilities services
 * File: utils.services.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */


/**
 * CSV parser for JSON data.
 *
 * @param {Object} json
 * @return {String} CSV data
 * @src public
 */

exports.json2csv = (json) => {
  let fields = Object.keys(json[0])
  let replacer = function(key, value) { return value === null ? '' : value }
  let csv = json.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  return csv.join('\r\n');
}
