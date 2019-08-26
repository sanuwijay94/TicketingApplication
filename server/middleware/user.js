const Ticket = require('../models/ticket');

module.exports.projectsOfEmployee = function(userId, callback){
    let tickets = [];
    Ticket.find({'assignee': userId}, '_id', function (err, result) {
        if (err) {
            return json(err);
        }
        for(let i=0; i<result.length; i++) {
            tickets[i] = result[i]._id;
        }
        return callback(tickets);
    })
};