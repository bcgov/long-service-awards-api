/*!
 * Long Service Awards Web API
 * File: app.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

"use strict";

// express init
const express = require("express");
const expressSession = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require('passport');
const { initPassport} = require("./services/auth.services");
require('dotenv').config();

// logging
const { requestLogger} = require("./logger");

// initialize database
const db = require("./db");

// Handlers
const { notFoundHandler, globalHandler } = require("./error");
const { authenticateSMS, initAuth } = require("./services/auth.services");

// session store
const pgSession = require('connect-pg-simple')(expressSession);

/**
 * Express Security Middleware
 *
 * Hide Express usage information from public.
 * Use Helmet for security HTTP headers
 * - Strict-Transport-Security enforces secure (HTTP over SSL/TLS)
 *   connections to the server
 * - X-Frame-Options provides click-jacking protection
 * - X-XSS-Protection enables the Cross-site scripting (XSS)
 *   filter built into most recent web browsers
 * - X-Content-Type-Options prevents browsers from MIME-sniffing
 *   a response away from the declared _static-type
 *   Content-Security-Policy prevents a wide range of attacks,
 *   including Cross-site scripting and other cross-site injections
 *
 *   Online checker: http://cyh.herokuapp.com/cyh.
 */
// const helmet = require('helmet');

// base API/application urls
const baseURL = process.env.LSA_APPS_BASE_URL;
const apiURL = process.env.LSA_APPS_API_URL;
const apiPort = process.env.LSA_APPS_API_PORT || 3000;
const appsURLs = [apiURL, process.env.LSA_APPS_ADMIN_URL, process.env.LSA_APPS_REGISTRATION_URL]
const nodeENV = process.env.NODE_ENV;

// init API routes
const indexRouter = require("./routes/auth.router");
const authController = require("./controllers/auth.controller");
const apiRouters = [
    {path: '/users', router: require("./routes/users.router")},
    {path: '/recipients/admin', router: require("./routes/recipients.admin.router")},
    {path: '/recipients/self', router: require("./routes/recipients.self.router")},
    {path: '/recipients/delegated', router: require("./routes/recipients.delegated.router")},
    {path: '/awards', router: require("./routes/awards.router")},
    {path: '/service-pins', router: require("./routes/service-pins.router")},
    {path: '/attendees', router: require("./routes/attendees.router")},
    {path: '/accommodations', router: require("./routes/accommodations.router")},
    {path: '/ceremonies', router: require("./routes/ceremonies.router")},
    {path: '/email', router: require("./routes/email.router")},
    {path: '/settings', router: require("./routes/settings.router")},
];

// configure CORS allowed hostnames
const allowedOrigins = process.env.NODE_ENV === "development" ? appsURLs : [baseURL];

const corsConfig = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg =
                "The CORS policy for this site does not allow access from the specified origin: \n" +
                origin;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },

    methods: ["GET", "POST"],
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// user session configuration
const session = {
    store: new pgSession({
        pool : db.pool,
        createTableIfMissing: true,
        tableName : 'user_sessions'
        // Insert connect-pg-simple options here
    }),
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: nodeENV === 'production'
    }
    // Insert express-session options here
};

/**
 * Set up API server (Node)
 */

const app = express();
app.disable("x-powered-by");
// api.use(helmet({contentSecurityPolicy: false}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// init user sessions
app.use(expressSession(session));

// init CORS config
app.use(cors(corsConfig));

// init log requests
app.use(requestLogger);

// parse cookies to store session data
app.use(cookieParser(process.env.COOKIE_SECRET));

// init Passport
app.use(passport.initialize())
app.use(passport.session());

// log into admin dashboard
app.post('/login',
    initPassport(passport).authenticate('local', {}, null),
    authController.login
);

// authenticate SMS session
app.use(authenticateSMS);

// init default super-admin users
initAuth().catch(console.error);

// init user routes (authentication not required)
app.use('/', indexRouter);

// init secure routes
apiRouters.forEach(apiRouter => {
    indexRouter.use(apiRouter.path, apiRouter.router);
});

// handle generic errors
app.use(globalHandler);

// handle 404 errors
app.use(notFoundHandler);

// Run API server
app.listen(apiPort, async () => {
    console.log(`============================================`);
    console.log(`API running on port ${apiPort}`);
    console.log(`\t- Node environment: ${nodeENV}`);
    console.log(`\t- Available on a web browser at: ${apiURL}`);
    console.log(`\t- Allowed origins:`, allowedOrigins.join(', '));
    console.log('Mail Settings')
    console.log(`\t- Server: ${process.env.MAIL_SERVER}`);
    console.log(`\t- Port: ${process.env.MAIL_PORT}`);
    console.log(`\t- From Email Address: ${process.env.MAIL_FROM_ADDRESS}`);
    console.log(`\t- From Name: ${process.env.MAIL_FROM_NAME}`);
    await db.test(); // check db init
    console.log(`============================================`);
});

// expose API
exports.api = app;