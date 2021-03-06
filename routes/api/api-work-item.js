
const express                   = require("express");
const middleware                = require("../../middleware/auth");
const workItemCollection        = require("../../dbSchema/workItem");
const projectCollection         = require("../../dbSchema/projects");
const userCollection            = require("../../dbSchema/user");
const _                         = require("lodash");
let router                      = express.Router();

const {
    UNASSIGNED,
    MAX_LENGTH_TITLE,
    MAX_LENGTH_DESCRIPTION,
    MAX_PRIORITY_POINTS,
    MAX_STORY_POINTS,
    EMPTY_SPRINT,
    WORK_ITEM_STATUS,
    WORK_ITEM_ICONS,
    capitalize
} = require('../../dbSchema/Constanst');


/**
 * METHOD: POST - Create new work item
 */
router.post("/api/:id/newWorkItem", middleware.isUserInProject, async function (req, res) {

    // new work item
    let {
        title,
        userAssigned,
        workItemStatus,
        teamAssigned,
        workItemType,
        sprint,
        workItemDescription,
        storyPoints,
        priorityPoints,
        tags
    } = req.body;

    // Fixing variables 
    userAssigned = userAssigned                 || UNASSIGNED.id;
    teamAssigned = teamAssigned                 || UNASSIGNED.id;
    workItemStatus = capitalize(workItemStatus) || Object.keys(WORK_ITEM_STATUS)[0]; // New is the default
    workItemType = capitalize(workItemType)     || Object.keys(WORK_ITEM_ICONS)[0]; // Story is the default value
    storyPoints = parseInt(storyPoints)         || 0;
    priorityPoints = parseInt(priorityPoints)   || MAX_PRIORITY_POINTS;
    tags = tags                                 || [];

    let errors = undefined;
    let addUserToTeam = false;

    // getting project info
    let projectInfo = await projectCollection.findOne({_id: req.params.id}).catch(err => {
        errors = err.reason;
        console.log("Error is: ", err.reason);
    });

    if (_.isEmpty(projectInfo) || _.isNull(projectInfo)){
        console.error("Error getting the project information: ", projectInfo);
        req.flash("error", "Cannot find the project to add the work item.");
        res.redirect(400, "back");
        return;
    }

    const users = projectInfo["users"];
    const teams = projectInfo["teams"].map(element => element._id);
    const sprints = projectInfo["sprints"];

    // to create a new work item
    let newWorkItem = {};

    // ============ Title ==============
    if (_.isEmpty(title) || title.length < 3){
        console.error("Title is to short");
        req.flash("error", "The title of the project is to short.");
        res.redirect(400, "back");
        return;
    }
    
    // =========== USER ID ================
    // Verify the user is in the project 
    if (userAssigned != UNASSIGNED.id && !users.includes(userAssigned)){
        console.error("Cannot find the user for the work item: ", userAssigned);
        req.flash("error", "Cannot find the user assigned for this work item");
        res.redirect(400, "back");
        return;
    }

    if (userAssigned != UNASSIGNED.id) {
        const _user = await userCollection
            .findOne({_id: userAssigned})
            .catch(err => {
                errors = err.reason
                console.error("Cannot get the user: ", err);
            });

        // -- 
        if (_user){
            newWorkItem["assignedUser"] = {name: _user["fullName"],'id': userAssigned};
            addUserToTeam = true;
        }else{
            console.error("Cannot find the user for the work item: ", userAssigned);
            req.flash("error", "Cannot find the user assigned for this work item");
            res.redirect(400, "back");
            return;
        }
    }
    // ================== STATUS ================

    // If empty, if not string, if not part of the work items
    if (_.isEmpty(workItemStatus) || !_.isString(workItemStatus) || !Object.keys(WORK_ITEM_STATUS).includes(workItemStatus)){
        console.error("unknow work item");
        req.flash("error", "Sorry, There is a problem with the status of the work item.");
        res.redirect(400, "back");
        return;
    }

    // =============== TEAMS =============
    if (teamAssigned != UNASSIGNED.id && !teams.includes(teamAssigned)){
        console.error("Error getting the team assigned for the work item");
        req.flash("error", "Sorry, We Cannot find the team assigned for this work item");
        res.redirect(400, "back");
        return;
    }

    // add the user if not default
    // TODO: if a user was assigned to this work item, then we should add that user to the team if the user is not in the team already. 
    if (teamAssigned != UNASSIGNED.id) 
        newWorkItem["teamId"] = teamAssigned;

    //  ================= TYPE ================
    if(Object.keys(WORK_ITEM_ICONS).includes(workItemType)){
        newWorkItem["type"] = workItemType;
    }

    // =============== SPRINT ==============
    if (sprints.includes(sprint)){
        newWorkItem["sprint"] = sprint;
    }

    // ================ POINTS ===============
    if ( _.isNumber(storyPoints) && !isNaN(storyPoints) && (storyPoints >= 0  && storyPoints <= MAX_STORY_POINTS)){
        newWorkItem["storyPoints"] = storyPoints;
    }

    // ================== priority ===============
    if ( _.isNumber(priorityPoints) && !isNaN(priorityPoints) && (priorityPoints >= 0  && priorityPoints <= MAX_PRIORITY_POINTS)){
        newWorkItem["priorityPoints"] = priorityPoints;
    }

    // ============== TAGS =================
    // if not empty and every value is a string
    if (!(_.isEmpty(tags)) && tags.every(val => _.isString(val))){
        newWorkItem["tags"] = tags;
    }

    newWorkItem["title"] = title;
    newWorkItem["status"] = workItemStatus;
    newWorkItem["description"] = workItemDescription;
    newWorkItem["projectId"] = req.params.id;
    
    // TODO: Create new schema for comments
    // newWorkItem["comments"]

    // add user to the team assigned if the user is not already in there. 
    if (newWorkItem["teamId"] || addUserToTeam){
        let teamId = newWorkItem["teamId"];
        let user = addUserToTeam ? newWorkItem["assignedUser"]: null;
        
        if (user.id && teamId){
            await projectInfo.addUserToTeam(user.id.toString(), teamId.toString() ).catch(err => {
                console.error(err);   
            });
        }
    }

    newWorkItem = await workItemCollection.create(newWorkItem).catch(err =>{
        errors = err.reason;
        console.error("Error creating the work item: ", err)
    });

    // verify work item was created
    if (_.isEmpty(newWorkItem) || _.isNull(newWorkItem)){
        req.flash("error", `There was an error creating the work item: ${errors}`);
        res.redirect(400, "back");
        return;
    }
    
    console.log("Was work item created: ", newWorkItem != undefined);
    res.redirect("back");
});

/**
 * METHOD: POST - Add a comment to the work item
 */
router.post("/api/:id/addCommentToWorkItem/:workItemId", middleware.isUserInProject, async function (req, res) {
    
    console.log("Getting request to add a comment to a work item...");
    
    // TODO: Verify if project exist and work item
    const projectId = req.params.id;
    const workItemId = req.params.workItemId;
    
    let  { comment } = req.body;

    // string and not empty
    if (_.isString(comment) && !_.isEmpty(comment.trim())){
        
        // clean the comment in case
        comment = comment.trim();

        // Add the comment to the DB
        const result = await workItemCollection.updateOne({_id: workItemId}, 
            { 
                $push: { "comments": comment }
            }
        ).catch(err => console.error("Error updating comments: ", err));

        if (!result){
            res.status(400).send("Error adding the comment to the work item, Please try later.");
            return;
        }
    }else{
        res.status(400).send("Comment is either empty or does not exist.");
        return;
    }

    res.status(200).send("Comment was added successfully!");
});

/**
 * METHOD: POST - Update work item
 */
router.post("/api/:id/update_work_item/:workItemId", middleware.isUserInProject, async function (req, res) {
    
    console.log("Getting request to update work item...");
    
    const projectId = req.params.id;
    const workItemId = req.params.workItemId;

    // =========== Validate project exist =================
    
    const project = await projectCollection.findById(projectId).catch(err => {
        console.error("Error getting the project info: ", err);
    });

    // verify project is good.
    if (_.isUndefined(project) || _.isEmpty(project)){
        res.status(400).send("Error getting the project information. Try later");
        return;
    }
    
    // =========== Validate Work Item exist =================
    
    const workItem = await workItemCollection.findById(workItemId).catch ( err =>{
        console.error("Error getting work item: ", err);
    });

     // verify project is good.
     if (_.isUndefined(workItem) || _.isEmpty(workItem)){
        res.status(400).send("Error getting the work Item information. Try later");
        return;
    }
    // Validate work item belong to this project id
    if (workItem.projectId != projectId){
        res.status(400).send("This work item does not belong to the project.");
        return;
    }
    // ======================================================

    // waiting for this params. Anything that cames undefined was not sent
    let  { 
        title,
        assignedUser,
        sprint,
        storyPoints,
        priorityPoints,
        status,
        teamId,
        type,
        description,
        tags,
    } = req.body;
    
    let addUserToTeam = false;
    let updateValues = {};

    // verify title
    if (_.isString(title) && title.length < MAX_LENGTH_TITLE){
        updateValues["title"] = title;
    }

    // verify assigned user
    if (_.isString(assignedUser)){
        
        // verify if the user was selected to unnasigned
        if (assignedUser == UNASSIGNED.id){
            updateValues["assignedUser"] = {name: UNASSIGNED.name};
        }else if(project.isUserInProject(assignedUser)){

            const user = await project.getUserName(assignedUser).catch(err => 
                console.error("Error getting the user: ", err)
            );

            if (user){
                addUserToTeam = true;
                updateValues["assignedUser"] = {name: user["fullName"], id: assignedUser}
            }
        }
    }
    
    // TODO: Verify sprint

    // verify story points
    if (!_.isEmpty(storyPoints)){

        if (!isNaN(storyPoints)){
            storyPoints = parseInt(storyPoints);
            if (storyPoints <= MAX_STORY_POINTS){
                updateValues["storyPoints"] = storyPoints;
            }
        }else{
            res.status(400).send("Story points is either empty or out of range.");
        }
    }

    // verify Priority points
    if (!_.isEmpty(priorityPoints)){

        if (!isNaN(priorityPoints)){
            priorityPoints = parseInt(priorityPoints);
            if (priorityPoints <= MAX_PRIORITY_POINTS){
                updateValues["priorityPoints"] = priorityPoints;
            }
        }else{
            res.status(400).send("Priority points is either empty or out of range.");
            return;
        }        
    }

    // verify Status
    if (_.isString(status)){
        const STATUS = Object.keys(WORK_ITEM_STATUS);
        status = capitalize(status);

        if (STATUS.includes(status)){
            updateValues["status"] = status;
        }else{
            res.status(400).send("The status for the work item does not match any of the status available");
            return;
        }
    }

    // verify team
    if (_.isString(teamId)){
    
        // verify if the user was selected to unnasigned
        if (teamId == UNASSIGNED.id){
            updateValues["teamId"] = null;
        }else if(project.isTeamInProject(teamId)){
            // verify is the user is in the project
            updateValues["teamId"] = teamId;
        }else{
            res.status(400).send("Cannot find the team.");
            return;
        }
    }

    // verify Type
    if (_.isString(type)){
        const TYPES = Object.keys(WORK_ITEM_ICONS);
        type = capitalize(type);

        if (TYPES.includes(type)){
            updateValues["type"] = type;
        }else{
            res.status(400).send("The type for the work item does not match any of the types available");
            return;
        }
    }

    // verify description
    if (_.isString(description)){
        
        if (description.length <= MAX_LENGTH_DESCRIPTION){
            updateValues["description"] = description;
        }else{
            res.status(400).send("Descrition is bigger than expected.");
            return;
        }
    }

    // array. Tags can be empty. when empty just remove the tags from work item
    if (_.isArray(tags)){
        if (_.isEmpty(tags) || tags.every(val => _.isEmpty(val))){
            updateValues["tags"] = [];
        }else{

            // all value tags are string and not empty
            all_are_string = tags.every(val => _.isString(val) && !_.isEmpty(val));

            if (all_are_string){
                updateValues["tags"] = tags;
            }else{
                res.status(400).send("Sorry, there was an error adding the tags.");
                return;
            }
        }
    }

    // add user to the team assigned if the user is not already in there. 
    if (updateValues["teamId"] || addUserToTeam){
        let teamId = updateValues["teamId"] || workItem["teamId"];
        let user = addUserToTeam ? updateValues["assignedUser"]: workItem["assignedUser"];
        
        if (user.id && teamId){
            await project.addUserToTeam(user.id.toString(), teamId.toString() ).catch(err => {
               console.error(err);   
            });
        }
    }

    // iter all over the update values
    for( key in updateValues){
        workItem[key] = updateValues[key];
    }
    
    await workItem.save().catch(err => {
        console.error("Error saving the work item: ", err);
    });

    res.status(200).send("Work Item was updated successfully!");
});

module.exports = router;