const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        first_name: {type: String, required: true},
        last_name: {type: String, required: true},
        date_of_birth: {type: Date},
        phone: {type: String, required: true},
        email: {type: String},
        type: {type: String, enum: ['Supervisor', 'Agent'], required: true},
        username: {type: String, required: true, index: { unique: true }},
        password: {type: String, required: true}
    }
);

// Virtual for user's full name
UserSchema
    .virtual('name')
    .get(function () {
        return this.first_name + ' ' + this.last_name;
    });

// Virtual for user's age
UserSchema
    .virtual('age')
    .get(function ()
    {
        const ageDifMs = Date.now() - this.date_of_birth.getTime();
        const ageDate = new Date(ageDifMs); // miliseconds from epoch
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    });

// Virtual for user's URL
UserSchema
    .virtual('url')
    .get(function () {
        return '/catalog/user/' + this._id;
    });

//Export model
module.exports = mongoose.model('User', UserSchema);