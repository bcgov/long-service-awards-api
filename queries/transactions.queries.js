/*!
 * Transactions queries
 * File: transactions.queries.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

"use strict";

const { query } = require("../db");

/**
 * Generate query: Upsert record into database.
 *
 * @param {Object} data
 * @return {Promise} results
 * @public
 */

exports.report = async (currentCycle) => {
  /**
   * Generate query: Report recipients data
   *
   * @param schema
   * @param {Object} filter
   * @param {Array} ignore
   * @return {Promise} results
   * @public
   */

  return query({
    sql: `
            SELECT transactions.id, transactions.created_at, transactions.error, transactions.code, transactions.description, transactions.details, contacts.first_name, contacts.last_name, recipients.employee_number FROM transactions
            LEFT JOIN recipients ON transactions.recipient = recipients.id
            LEFT JOIN contacts ON recipients.contact = contacts.id
            WHERE transactions.error = true
            ORDER BY transactions.id DESC
        `,
  });
};

exports.removeForUser = async (id) => {
  // LSA-540 Remove any Transactions tied to this user

  return query({
    sql: `
            DELETE FROM transactions WHERE transactions.user = $1::uuid
        `,
    data: [id],
  });
};
exports.updateTransactionQueueStatus = async (txid, status) => {
  return query({
    sql: `UPDATE transactions SET queued = ${status} WHERE txid = '${txid}' RETURNING *`,
  });
};
exports.updateTransactionError = async (txid, error) => {
  return query({
    sql: `UPDATE transactions SET queued = false, description = 'CHES Error', error = true, details = '${error}' WHERE txid = '${txid}' RETURNING *`,
  });
};
