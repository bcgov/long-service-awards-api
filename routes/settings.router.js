/*!
 * Global Settings router
 * File: settings.auth.router.js
 * Copyright(c) 2022 BC Gov
 * MIT Licensed
 */

const express = require("express");
const router = express.Router();
const { authorizeSuperAdmin } = require("../services/auth.services");
const controller = require("../controllers/settings.controller")
const models = {
    accommodations: require("../models/accommodations.model.js"),
    organizations: require("../models/organizations.model.js"),
    milestones: require("../models/milestones.model.js"),
    qualifying_years: require("../models/qualifying-years.model.js"),
    communities: require("../models/communities.model"),
    provinces: require("../models/provinces.model"),
    settings: require("../models/settings.model.js"),
    "pecsf-charities": require("../models/pecsf-charities.model.js"),
    "pecsf-regions": require("../models/pecsf-regions.model.js")
}

/**
 * Middleware to select model sent to controller.
 */

const selectModel = async (req, res, next) => {
    const {model} = req.params || {};
    if (model && models.hasOwnProperty(model)) {
        res.locals.model = models[model];
        next();
    }
    else {
        return next(new Error('noAuth'));
    }
}

/**
 * Router endpoints
 */

router.get('/:model/list', selectModel, controller.getAll);
router.post('/:model/create', authorizeSuperAdmin, selectModel, controller.create);
router.post('/:model/update/:id', authorizeSuperAdmin, selectModel, controller.update);
router.get('/:model/delete/:id', authorizeSuperAdmin, selectModel, controller.remove);
router.get('/:model/:id', authorizeSuperAdmin, selectModel, controller.get);

module.exports = router;
