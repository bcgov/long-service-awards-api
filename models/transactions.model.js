/*!
 * Transaction model
 * File: transaction.model.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const db = require("../queries/index.queries");

("use strict");

/**
 * Model schema
 *
 * @return {Array} results
 * @public
 */

const schema = {
  modelName: "transactions",
  attributes: {
    id: {
      dataType: "integer",
      required: true,
    },
    recipient: {
      dataType: "uuid",
    },
    user: {
      dataType: "uuid",
    },
    txid: {
      dataType: "uuid",
    },
    queued: {
      dataType: "boolean",
    },
    code: {
      dataType: "varchar",
      required: true,
    },
    error: {
      dataType: "boolean",
    },
    description: {
      dataType: "varchar",
      required: true,
    },
    details: {
      dataType: "text",
      required: true,
    },
    created_at: {
      dataType: "timestamp",
    },
  },
};

module.exports = db.generate(schema);

module.exports.report = async (user, cycle) => {
  // check if user is administrator (skip user-org filtering)
  const { role } = user || {};
  const isAdmin = ["super-administrator", "administrator"].includes(role.name);
  if (isAdmin) {
    return await db.transactions.report(cycle);
  }
};

module.exports.updateTransactionQueueStatus = async (txid, status) => {
  return await db.transactions.updateTransactionQueueStatus(txid, status);
};

module.exports.updateTransactionError = async (txid, error) => {
  return await db.transactions.updateTransactionError(txid, error);
};

module.exports.removeForUser = async (id) => {
  // LSA-540 Remove any Transactions tied to this user

  return await db.transactions.removeForUser(id);
};
