/*!
 * Cache processing services
 * File: cache.services.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const { createClient } = require('redis');
const bcrypt = require("bcrypt");
const crypto = require('crypto');

"use strict";

/**
 * Init Redis cache connection
 */

const client = createClient({
  url: process.env.LSA_REDIS_CACHE_HOST
});
client.on('error', err => console.error('Redis Client Error', err));

/**
 * Reset cache entry (Redis)
 */

module.exports.resetToken = async (key, expiry) => {
  try {
    // connect to redis
    await client.connect();

    // check if reset token already exists (delete if true)
    const existingToken = await client.get(key);

    if (existingToken) await client.del(key);

    // generate password reset token
    let resetToken = crypto.randomBytes(32).toString("hex");

    // store hash of token in cache
    // - set expiry date
    const hash = await bcrypt.hash(resetToken, Number(process.env.ENCRYPT_SALT));

    console.log(key, expiry, hash)

    await client.set(key, resetToken, {
      EX: expiry
    });

    // disconnect from redis
    await client.disconnect();

    // return hashed token value
    return hash;
  } catch (err) {
      console.error(err)
     return null
  }

}
