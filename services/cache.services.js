/*!
 * Cache processing services
 * File: cache.services.js
 * Copyright(c) 2023 BC Gov
 * MIT Licensed
 */

const { createClient } = require("redis");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

("use strict");

/**
 * Hash token utility
 */

const hashToken = async (token) => {
  // hash token using global salt value
  return await bcrypt.hash(token, Number(process.env.ENCRYPT_SALT));
};

/**
 * Generate token utility
 */

const generateToken = () => {
  // generate random 32-char token
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Escape token utility
 */

const escapeToken = (token) => {
  // convert to uri-escaped token
  return encodeURIComponent(token).replace(".", "+");
};

/**
 * Unescape token utility
 */

const unEscapeToken = (escapedToken) => {
  // convert to uri-unescaped token
  return decodeURIComponent(escapedToken).replace("+", ".");
};

/**
 * Init Redis cache connection
 */

const client = createClient({
  url: process.env.LSA_REDIS_CACHE_HOST,
  password: process.env.LSA_REDIS_CACHE_PASSWORD,
});
client.on("error", (err) => console.error("Redis Client Error", err));

/**
 * Get cache entry (Redis)
 */
const getToken = async (key) => {
  try {
    // connect to redis
    if (!client.isReady) await client.connect();

    // get token from cache
    const token = await client.get(key);

    // return token
    return token;
  } catch (err) {
    console.error(err);
    return null;
  }
};
module.exports.getToken = getToken;

/**
 * Deletes a cache entry (Redis)
 * @param {key} Key of cache entry (could be )
 * @returns Integer reply: The number of keys that were removed.
 */

module.exports.deleteToken = async (key) => {
  try {
    // connect to redis
    if (!client.isReady) await client.connect();

    // Delete token from cache
    const deletedNumOfTokens = await client.del(key);

    // return number of deleted tokens
    return deletedNumOfTokens;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Compare input token with cached (Redis)
 */

module.exports.validateToken = async (key, token) => {
  // get current cached token for given key
  const storedToken = await getToken(key);
  // compare token with hashed in cache
  // - see bcrypt documentation: https://github.com/kelektiv/node.bcrypt.js
  return storedToken && token
    ? await bcrypt.compare(token, storedToken)
    : false;
};

/**
 * Reset cache entry (Redis)
 */

module.exports.resetToken = async (key, expiry) => {
  try {
    // connect to redis
    if (!client.isReady) await client.connect();

    // check if reset token already exists (delete if true)
    const existingToken = await client.get(key);
    // remove existing token (if exists)
    if (existingToken) await client.del(key);
    // generate new token
    const resetToken = generateToken();
    // hash token using global salt value
    const hash = await hashToken(resetToken);

    // cache the new token
    // - use input expiry seconds
    await client.set(key, hash, {
      EX: expiry,
    });

    // return URI-escaped hashed token value
    return resetToken;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 *
 * @param {*} key
 * @param {*} expiry
 * @returns
 */
module.exports.rsvpToken = async (key, expiry) => {
  try {
    // connect to redis
    if (!client.isReady) await client.connect();

    // check if reset token already exists (delete if true)
    const existingToken = await client.get(key);
    // remove existing token (if exists)
    if (existingToken) await client.del(key);
    // generate new token
    const rsvpToken = generateToken();
    // hash token using global salt value
    const hash = await hashToken(rsvpToken);

    // cache the new token
    // - use input expiry seconds
    await client.set(key, hash, {
      EX: expiry,
    });

    // return URI-escaped hashed token value
    return rsvpToken;
  } catch (err) {
    console.error(err);
    return null;
  }
};
