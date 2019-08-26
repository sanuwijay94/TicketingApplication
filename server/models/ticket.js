const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TicketSchema = new Schema(
    {
        subject: {type: String, required: true},
        Description: {type: String, required: true},
        created_date: {type: Date, required: true},
        due_date: {type: Date, required: true},
        ticket_state: {type: String, enum: ['Open', 'Progressing', 'Done', 'Closed'], required: true},
        assignee: {type: Schema.ObjectId, ref: 'User', required: true},
        submitter: {type: Schema.ObjectId, ref: 'User', required: true},
        requester: {type: String, required: true}
    }
);

// Virtual for duration of the ticket
TicketSchema
    .virtual('duration')
    .get(function ()
    {
        const date1 = this.created_date;
        const date2 = this.due_date;
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return diffDays;
    });

// Virtual for URL of ticket
TicketSchema
    .virtual('url')
    .get(function () {
        return '/catalog/ticket/' + this._id;
    });

//Export model
module.exports = mongoose.model('Ticket', TicketSchema);