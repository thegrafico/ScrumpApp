// id of the form 
const FORM_ID_CREATE_TEAM = "#createTeamForm";
const CREATE_TEAM_MODAL_ID = ".create-team-modal";
const CREATE_TEAM_SUBMIT_BTN = "#create-team-submit-btn";

const INPUT_TEAM_NAME = "#teamName";
const INPUT_TEAM_USERS = "#listOfUsers";
const INPUT_TEAM_LIST_OF_USERS = ".teamUserList";
const SPAN_ID_TEAM_NAME = "#teamNameSpanError";
const SPAN_ID_USER_LIST = "#teamUsersSpanError";
const INPUT_SUBMIT_TEAM = "#create-team-submit-btn";

const CLOSE_BTN_CREATE_TEAM = "#closeCreateTeamBtn";
const CLOSE_BTN_DELETE_TEAM = "#closeRemoveTeamBtn";

const TEAM_NAME_LENGHT_MAX_LIMIT = 20;
const TEAM_NAME_LENGHT_MIN_LIMIT = 3;


/**
 * This function is fire as soon as the DOM element is ready to process JS logic code
 * Same as $(document).ready()...
 */
$(function (){

    // make the select opction for deleting a team a select2 element
    $(TEAM_SELECT_INPUT_ID).select2();

    // BTN when the user submit the form information to create a new project
    $(CREATE_TEAM_SUBMIT_BTN).on("click", async function(event){
        
        // remove the default from the form so we can control when to submit the information. 
        event.preventDefault();

        // TODO: verify team name is not already taken in the project
        const teamName = $(INPUT_TEAM_NAME).val().trim();
        const userId = $(INPUT_TEAM_USERS).attr('id').trim();

        // string, not empty and just letters
        const {isValid, reason} = validateTeamName(teamName);

        if (!isValid){
            showErrSpanMessage(SPAN_ID_TEAM_NAME, reason);
            return;
        }

        // Request var
        const projectId = $(PROJECT_ID).val();
        const API_LINK_CREATE_TEAM = `/dashboard/api/${projectId}/newTeam`;
        const data = {"teamName": teamName};

        let response_error = null;
        const response = await make_post_request(API_LINK_CREATE_TEAM, data).catch(err => {
            response_error = err;
        });

        // Success message
        if (response){
            $.notify(response, "success");
            $(CLOSE_BTN_CREATE_TEAM).click();
        }else{ // error messages
            $.notify(response_error.data.responseText, "error");
        }

    });

    // ================= DELETE TEAM EVENTS ================
    $(DELETE_TEAM_SUBMIT_BTN).on("click", async function(){
    
        let selectedTeamId = $("#listOfTeams").val();

        if (selectedTeamId == "0" || !_.isString(selectedTeamId)){
            $.notify("Invalid team.", "error");
            return;
        }

        const projectId = $(PROJECT_ID).val();

        const API_LINK_DELETE_TEAM = `/dashboard/api/${projectId}/deleteTeam`;

        let response_error = null;
        const response = await make_post_request( API_LINK_DELETE_TEAM, {"teamId": selectedTeamId} ).catch(err => {
            response_error = err;
        });

        if (response){
            $.notify("Team deleted!", "success");
            $(CLOSE_BTN_DELETE_TEAM).click();
        }else{
            $.notify(response_error.data.responseText, "error");
        }
    });

    // Team Name field
    $(INPUT_TEAM_NAME).keyup(function(){
        
        // get user selected name
        const teamName = $(this).val().trim();

        const {isValid, reason} = validateTeamName(teamName);

        if (!isValid){
            showErrSpanMessage(SPAN_ID_TEAM_NAME, reason);
            return;
        }

        hideErrSpanMessage(SPAN_ID_TEAM_NAME);
    });

    // User field
    $(INPUT_TEAM_USERS).on("change",function(){
        
        // get user selected name
        const userName = $(this).val().trim().toLowerCase();

        // getting all usernames
        const all_users = $(INPUT_TEAM_LIST_OF_USERS).map((_,element) => element.value.trim().toLowerCase()).get().filter( element => {
            return !_.isEmpty(element);
        });

        if (!all_users.includes(userName)){
            showErrSpanMessage(SPAN_ID_USER_LIST, "It looks like that user does not exits.");
            return;
        }

        hideErrSpanMessage(SPAN_ID_USER_LIST);
    });
    
    // clean the project modal
    $(CREATE_TEAM_MODAL_ID).on('show.bs.modal', function (e) {
        $(INPUT_TEAM_NAME).val('');
        $(INPUT_TEAM_USERS).val('');     
    });

    // TRASH BTN EVENT 
    $(TRASH_BTN_MANAGE).on("click", async function(){
        let checkedElements = getCheckedElements(TABLE_ROW_CHECKBOX_ELEMENT_CHECKED);
       
        // check if not empty
        if (!_.isArray(checkedElements) || _.isEmpty(checkedElements) ){return;}

        const projectId = $(PROJECT_ID).val();
        const teamId = $(FILTER_BY_TEAM_INPUT).val();

        const data = {"teamId": teamId, "userIds": checkedElements};
        const API_LINK_REMOVE_USERS_FROM_TEAM = `/dashboard/api/${projectId}/removeUsersFromTeam/`

        let response_error = undefined;
        const response = await make_post_request(API_LINK_REMOVE_USERS_FROM_TEAM, data).catch(err => {
            response_error = err;
        });

        if (response){
            $.notify(response, "success");
        }else{
            $.notify(response_error.data.responseText, "error");
        }
    });


});

/**
 * Validate the name of the team
 * @param {String} name - name of the team
 * @returns {Object} - {isValid: Boolean, reason: String or null}
 */
function validateTeamName(name){

    let error_message = null;

    // if empty
    if (_.isEmpty(name)){
        error_message = "Name cannot be empty";
    }else if( !(/^[a-zA-Z\s]+$/.test(name)) ){
        error_message = "Name cannot include symbols and numbers";
    }else if(name.length < TEAM_NAME_LENGHT_MIN_LIMIT){
        error_message = "Message is to short";
    }else if(name.length > TEAM_NAME_LENGHT_MAX_LIMIT){
        error_message = "Name is to big.";
    }

    return {"isValid": error_message == null, "reason": error_message};
}