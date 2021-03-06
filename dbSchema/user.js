/**
 * DB modal to store all users
 */

// import DB
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

let userSchema = new mongoose.Schema({
    fullName: {type: String, required: true},
    email: {type: String, required: true, index: {unique: true}},
    password:  {type: String, required: true},
}, {timestamps: true});

userSchema.index({username_1: 1}, {unique: false});

userSchema.plugin(passportLocalMongoose);

// TODO: I am use bctypt, but you need your comparer function
userSchema.methods.verifyPassword = function(password) {
    return password == this.password
};

module.exports = mongoose.model("Users", userSchema);

