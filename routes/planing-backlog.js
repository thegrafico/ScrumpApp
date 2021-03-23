/**
 * MAIN page to show a project detail
 * AUTHOR: Raul Pichardo
 * DATE: Jan 31, 2021
 */

// ============= CONST AND DEPENDENCIES =============
const express                   = require("express");
const _                         = require("lodash");
const validator                 = require("validator");
const STATUS                    = require('../dbSchema/Constanst').projectStatus;
const moment                    = require('moment');
const projectCollection         = require("../dbSchema/projects");
const sprintCollection          = require("../dbSchema/sprint");
const teamProjectCollection     = require("../dbSchema/projectTeam");
const middleware                = require("../middleware/auth");
let router                      = express.Router();

const {
    UNASSIGNED_USER, 
    EMPTY_SPRINT,
} = require('../dbSchema/Constanst');

// ===================================================


/**
 * METHOD: GET - show the main page for projects
 */
router.get("/:id/planing/backlog", middleware.isUserInProject, async function (req, res) {

    let projectId = req.params.id;

    // verify is the project exists
    let projectInfo = await projectCollection.findOne({
        _id: projectId
    }).catch(err => {
        console.log("Error is: ", err.reason);
    });

    // console.log("Project information: ", projectInfo);

    if (_.isUndefined(projectInfo) || _.isEmpty(projectInfo)) {
        // TODO: show a message to the user
        return res.redirect('/');
    }

    // TODO: Verify which project is the user in, and set that to be the selected in the frontend
    // get all the teams for this project
    let teams = await teamProjectCollection.find({projectId}).catch(err => console.log(err)) || [];
    teams.unshift(UNASSIGNED_USER);

    let sprints = await sprintCollection.find({projectId}).catch(err => console.log(err)) || [];
    sprints.unshift(EMPTY_SPRINT);

    // get all users for this project -> expected an array
    let users = await projectCollection.getUsers(projectId).catch(err => console.log(err)) || [];
    users.unshift(UNASSIGNED_USER);

    // populating params
    let params = {
        "project": projectInfo,
        "projectId": projectId,
        "activeTab": "Backlog,Planing",
        "tabTitle": "Backlog",
        "assignedUsers": users,
        "statusWorkItem": STATUS,
        "teamWorkItem": teams,
        "sprints": sprints,
    };


    res.render("planing-backlog", params);
});

/**
 * METHOD: GET - show the main page for projects
 */
router.post("/:id/planing/backlog/newWorkItem", middleware.isUserInProject, async function (req, res) {

    // new work item
    const {
        title,
        userAssigned,
        statusWorkItem,
        teamAssigned,
        workItemType,
        sprint,
        workItemDescription,
        storyPoints,
        priorityPoints,
        comments
    } = req.body;
    console.log(req.body);

    // Title
    if (_.isEmpty(title) || title.length < 3){
        res.status(400).send("Title cannot be empty and have to be grater than 3 chars.");
        return res.redirect("back");
    }

    // User assigned
    // TODO: Verify if the user exits

    // Status
    if (_.isEmpty(statusWorkItem) || !STATUS[parseInt(statusWorkItem)]){
        res.status(400).send("Status cannot be empty");
        return res.redirect("back");
    }

    // Team
    // TODO: Verify if the team exits

    // work item type
    

    res.redirect("back");
});

module.exports = router;