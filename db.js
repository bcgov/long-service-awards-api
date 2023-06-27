/*!
 * Database initialization
 * File: db.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

'use strict';

/**
 * Initialize connection pool / client
 *
 * @public
 */

const pg = require('pg');
require('dotenv').config();

/**
 * Create client pool to allow for reusable pool of
 * clients to check out, use, and return.
 */

const pool = new pg.Pool({
  user: process.env.DATABASE_USER,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  max: 30, // max number of clients in the pool
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 10000
});

/**
 * Pool will emit an error on behalf of any idle clients
 * it contains if a backend error or network partition
 * happens.
 */

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err, client);
});

pool.on('acquire', function (client) {});

pool.on('connect', function (err, client, release) {
  // console.log(
  //     '\n-------\nPool total:',
  //     pool.totalCount,
  //     '\nPool idle:',
  //     pool.idleCount,
  //     '\nPool waiting:',
  //     pool.waitingCount
  // );
});

pool.on('remove', function () {});

/**
 * pg database initialization test.
 */

exports.test = async () => {
  // NOTE: client undefined if connection fails.
  const client = await pool.connect();
  try {
    await client.query(`SELECT 1;`, []);
    console.log(`Database ${process.env.DATABASE_NAME} listening on port ${process.env.DATABASE_PORT}`);
  } catch (err) {
    console.error('Database failed to initialize', err);
    throw err;
  } finally {
    await client.release(true);
  }
}

/**
 * PG database query wrapper for multiple records.
 *
 * @param {Object} query
 * @return {Promise} result
 */

exports.query = async (query) => {
  // NOTE: client undefined if connection fails.
  const client = await pool.connect();
  try {
    const result = await client.query(query.sql, query.data);
    const { rows=[] } = result || {}
    return rows.length > 0 ? rows : null;
  } catch (err) {
    throw err;
  } finally {
    await client.release(true);
  }
}

/**
 * PG database query wrapper for single record.
 *
 * @param {Object} query
 * @return {Promise} result
 */

exports.queryOne = async (query) => {
  // NOTE: client undefined if connection fails.
  const client = await pool.connect();
  try {
    const result = await client.query(query.sql, query.data);
    const {rows=[]} = result || {};
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    throw err;
  } finally {
    await client.release(true);
  }
}

/**
 * PG database query wrapper for transaction.
 * - returns multiple records
 *
 * @param {Array} queries
 * @return {Promise} result
 */

exports.transaction = async (queries) => {
  // NOTE: client undefined if connection fails.
  const client = await pool.connect();
  try {
    await client.query(`BEGIN`);
    let result = [];
    await Promise.all(queries.map(async(q) => {
      const res = await client.query(q.sql, q.data);
      const {rows=[]} = res || {}
      result = rows.length > 0 ? rows : null;
      return rows;
    }));
    await client.query(`COMMIT`);
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.release(true);
  }
}

/**
 * PG database query wrapper for transaction.
 * - returns single record
 *
 * @param {Array} queries
 * @return {Promise} result
 */

exports.transactionOne = async (queries) => {
  // NOTE: client undefined if connection fails.
  const client = await pool.connect();
  try {
    await client.query(`BEGIN`);
    let result = [];
    await Promise.all(queries.map(async(q) => {
      const res = await client.query(q.sql, q.data);
      const {rows=[]} = res || {};
      result = rows.length > 0 ? rows[0] : null;
      return result;
    }));
    await client.query(`COMMIT`);
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.release(true);
  }
}

/**
 * pg database pool.
 */

exports.pool = pool;
