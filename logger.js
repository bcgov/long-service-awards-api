/*!
 * API request loggers
 * File: logger.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

require('dotenv').config();
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
    exceptionHandlers: [new winston.transports.File({ filename: "exceptions.log" })],
    rejectionHandlers: [new winston.transports.File({ filename: "rejections.log" })],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

exports.logger = logger;

exports.requestLogger = function (req, res, next) {
    const d = new Date();
    logger.info(`[${process.env.NODE_ENV}] - ${req.originalUrl} - ${req.method} - ${req.ip} ${d}`);
    next();
}