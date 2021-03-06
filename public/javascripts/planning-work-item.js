/**
 * Front-end JS Code for planing-work-item route
 */


// =========== This function is fire as soon as the file is loaded after the HTML ===========
$(function () {

    // show the active tab in the sidebar
    showActiveTab();

    // click on planing just to show to the user in the sidebar
    $(BTN_PLANING).click();
    
    /**
     * CHECKBOX BOR WORK ITEM TABLE 
     */
    $(document).on("click", TABLE_ROW_CHECKBOX_ELEMENT, function () {

        // $(TABLE_ROW_CHECKBOX_ELEMENT).on("click", function(){
        
        // get the parent element. In this case, it will be the the label element
        let _parent = $( this ).parent();

        // since we are changing the whole row, we need the element that has everything inside
        let granFather = $(_parent).parent().parent();

        let atLeastOneCheckBoxIsChecked = ($(`${TABLE_ROW_CHECKBOX_ELEMENT}:checked`).length > 0);
    
        enableTrashButton(atLeastOneCheckBoxIsChecked);
        
        if (_parent.hasClass("invisible")){
            _parent.removeClass("invisible");
            granFather.addClass(HIGHLIGST_CLASS);
        }else{
            _parent.addClass("invisible");
            granFather.removeClass(HIGHLIGST_CLASS);
        }
    });

    // ADD COMMENT 
    $(BTN_ADD_COMMENT).on("click", function(){
        
        const comment = $(WORK_ITEM["discussion"]).val();
        const workItemId = $(WORK_ITEM_ID).val();
        const projectId = $(PROJECT_ID).val();
    
        if (workItemId == undefined || projectId == undefined){
            // TODO: add a message to the UI
            alert("There is a problem getting the information for this work item");
            return;
        }

        // TODO: clean text before inserting in database
        if ( (comment && comment.trim().length > 0)){
            addCommentToWorkItem(projectId, workItemId, comment.trim());
        }else{
            // TODO: show a message to the user that empty comment cannot be added
            alert("Cannot add an empty comment.")
        }
    });

    // REMOVE THE WORK ITEMS SELECTED IN CHECKBOX
    // TODO: Create a database modal to store deleted element
    $(TRASH_BTN_WORK_ITEM).on("click", function(){
        
        // get checked elements in table
        const row_checked = getCheckedElements(TABLE_ROW_CHECKBOX_ELEMENT_CHECKED);

        const projectId = $(PROJECT_ID).val();
        
        removeWorkItems(projectId, row_checked);
    });

    // ==================== CLEANING THE MODAL WHEM OPEN =================

    // clean the modal to add an user
    $(createWorkItemModal).on('shown.bs.modal', function (e) {
        $(WORK_ITEM["title"]).trigger("focus");
    });

    $(createWorkItemModal).on('show.bs.modal', function (e) {
        cleanModal();
    });

    // ================== CHECKING TITLE ERRORS =================
    checkTitleWhenOpen();
    // When title input is changed
    $(WORK_ITEM["title"]).on("input", function () {
        
        // Using functions from helper.js in order to show or hide the elements
        if ( (($(this).val()).length) > 0) {
            hideElement(spanTitleMsg);
        } else {
            showElement(spanTitleMsg);
        }
    });

    /**
     * Event to change the type of the work item
     */
    $(BTN_CHANGE_WORK_ITEM_TYPE).on("click", function () {
        updateCustomSelect(this, CURRENT_WORK_ITEM_TYPE, WORK_ITEM["type"]);
    });

    /**
     * Event to change the status of the work item
     */
    $(BTN_CHANGE_WORK_ITEM_STATUS).on("click", function () {
        updateCustomSelect(this, CURRENT_WORK_ITEM_STATUS, WORK_ITEM["state"]);
    });

    // Add tag
    $(addTagBtn).on("click", function () {

        // get number of element
        let childrens = ($(TAG_CONTAINER).children()).length;

        if (childrens <= MAX_NUMBER_OF_TAGS) {
            $(TAG_CONTAINER).append(TAG_TEMPLATE);
        } else {
            alert(`Each story cannot have more than ${MAX_NUMBER_OF_TAGS} tags`);
        }
    });

    /**
     * Event to remove the tag when the user click the 'x' button
     */
    $(document).on("click", rmTag, function () {
        $(this).parent().remove();
        
        // Trigger the tags container in oder to active the save button
        $("#tagsContainer").trigger("change");
    });

    $(CREATE_WORK_ITEM_FORM).on("submit", function(event){
        
        isFormValid = validateFormWorkItem();
        
        if (!isFormValid){
            event.preventDefault();
        }
    });

    // TOGGLE THE FILTER
    $(FILTER_BTN).on("click", function() {
        toggleFilter()
    });

});

/**
 * Enable the functionality for the trash button
 * @param {Boolean} enable - True if wants to enable the trash button, false if wants to disable
 */
function enableTrashButton(enable){
    
    if (enable){
        $(TRASH_BTN_GENERAL_CLASS).attr("disabled", false);
        $(`${TRASH_BTN_GENERAL_CLASS} i`).removeClass("grayColor");
        $(`${TRASH_BTN_GENERAL_CLASS} i`).addClass("redColor");
    }else{
        $(TRASH_BTN_GENERAL_CLASS).attr("disabled", true);
        $(`${TRASH_BTN_GENERAL_CLASS} i`).removeClass("redColor");
        $(`${TRASH_BTN_GENERAL_CLASS} i`).addClass("grayColor");
    }
}

/**
 * Add a comment to a work item for a project
 * @param {String} projectId 
 * @param {String} workItemId 
 * @param {String} comment 
 */
async function addCommentToWorkItem(projectId, workItemId, comment){
    
    if (projectId == undefined || workItemId == undefined){
        // TODO: add error message to the user
        alert("Error getting the paramenters to add the comment to work item");
        return;
    }

    // link to make the request
    const API_LINK_ADD_COMMENT = `/dashboard/api/${projectId}/addCommentToWorkItem/${workItemId}`;
    
    // check of comments
    if (comment.trim().length == 0){
        console.error("Cannot add empty comment");
        return;
    }

    // Data to make the request
    const request_data = {comment: comment.trim()}

    let response_error = null;
    const response = await make_post_request(API_LINK_ADD_COMMENT, request_data).catch(err=> {
        response_error = err;
    });
    
    if (response){
        // since the request is done (Success), we can add the html 
        const comment_html = COMMENT_HTML_TEMPLATE.replace(REPLACE_SYMBOL, comment);
        addToHtml(USER_COMMENT_CONTAINER, comment_html); // Helper function

        // update the number of comments
        let currentNumberOfComments = parseInt($(NUMBER_OF_COMMENTS_SPAN).text().trim());
        $(NUMBER_OF_COMMENTS_SPAN).text(++currentNumberOfComments);

        // clean the textarea for the user
        $(WORK_ITEM["discussion"]).val('');
    }else{
        $.notify(response_error.data.responseText, "error");
    }
}

/**
 * Remove the work item from the project
 * @param {Array} workItemsId - Array with all work item ids 
 */
async function removeWorkItems(projectId, workItemsId){
    // TODO: maybe change this to the https: format? 
    const API_LINK_REMOVE_WORK_ITEMS =`/dashboard/api/${projectId}/removeWorkItems`;

    if (!workItemsId || workItemsId.length == 0){
        console.error("Cannot find the work items to remove");
        return;
    }

    const request_data = {workItemsId};

    let response_error = null;
    const response = await make_post_request(API_LINK_REMOVE_WORK_ITEMS, request_data).catch(err=> {
        response_error = err;
    });

    if (response){
        removeCheckedElement();

        $.notify(response, "success");

        // disable the trash button again
        enableTrashButton(false);
    }else{
        $.notify(response_error.data.responseText, "error");
    }
}

function checkTitleWhenOpen(){
    try{
        //  PRIOR check if the title has already something in it
        if ($(WORK_ITEM["title"]).val().length == 0){
            showElement(spanTitleMsg);
        }
    }catch(err) {

    }

}