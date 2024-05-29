const { transactionOne, query, queryOne } = require("../db");

const awardOptionQueries = {
  upsert: (data, schema) => {
    const conflict = [""];
    // return null if instance is null
    if (!schema.modelName) return null;

    const timestamps = ["updated_at", "created_at"];
    let offset = 0;

    // generate columns list to upsert
    // - sort conflict fields to front of array
    const columns = Object.keys(schema.attributes)
      //.filter((attr) => !schema.attributes[attr].serial)
      .sort(function (x, _) {
        return conflict.includes(x) ? -1 : 0;
      });

    // generate values array to insert/upsert
    // - filter serial fields (e.g., serial IDs)
    const values = columns
      //.filter((attr) => !schema.attributes[attr].serial)
      .map((attr, index) => {
        const placeholder = timestamps.includes(attr)
          ? `NOW()`
          : `$${index + offset}`;
        return `${placeholder}::${schema.attributes[attr].dataType}`;
      });

    // define upsert assignments on conflict
    // - filter conflict fields
    // - filter serial fields (e.g., serial IDs)
    // - filter created timestamps
    const conflictAssignments = columns
      .filter((attr) => !conflict.includes(attr))
      .filter((attr) => attr !== "created_at")
      .map((attr, index) => {
        // handle timestamp placeholders defined in arguments
        // - set assignment index offset to account for conflict fields (ignore them)
        const placeholder = timestamps.includes(attr)
          ? `NOW()`
          : `$${index + conflict.length + offset}`;
        // map returns conjoined prepared parameters in order
        return [
          `"${attr}"`,
          `${placeholder}::${schema.attributes[attr].dataType}`,
        ].join("=");
      });

    // check if any fields remain for update on conflict
    const updateAction =
      conflictAssignments.length === 0
        ? "NOTHING"
        : `UPDATE ${schema.modelName}  SET ${conflictAssignments
            .slice(1)
            .join(", ")} WHERE ${conflictAssignments[0]}`;

    let sql = "";
    if (data.id) {
      sql = `
            ${updateAction}
            RETURNING *;`;
    } else {
      sql = `
            INSERT INTO ${schema.modelName} ("${columns
        .slice(1)
        .join('", "')}") VALUES (${values.slice(1).join(", ")})
            RETURNING *;`;
    }

    // filter input data to match insert parameters
    // - filters: ignored, timestamp, null ID attributes
    // - sort data by conflict fields (put to front of array)
    let filteredData = Object.keys(schema.attributes)
      .filter((attr) => !timestamps.includes(attr))
      .filter((attr) => attr != "id" || (attr == "id" && data.id != null))
      .sort(function (x) {
        return conflict.includes(x) ? -1 : 0;
      })
      .map((attr) => {
        return data && data.hasOwnProperty(attr) ? data[attr] : null;
      });

    return { sql: sql, data: filteredData };
  },
};
/**
 * Generate query: Update recipient record in table.
 *
 * @param {Object} data
 * @param {Object} schema
 * @return {Promise} results
 * @public
 */

const upsert = async (data, schema, conflict) => {
  return await transactionOne([awardOptionQueries.upsert(data, schema)]);
};
exports.upsert = upsert;
