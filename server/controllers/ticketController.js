const Ticket = require('../models/ticket');
const userMiddleware = require('../middleware/user');
const { validate } = require('indicative');


// Display list of all Ticket.
exports.ticket_list = function(req, res) {
    Ticket.find({}, '_id subject description resources created_date due_date ticket_state assignee submitter requester', function (err, result) {
        if (err||!result) {
            return res.status(404).json({
                message: "Unable to get all tickets",
                error: err
            });
        }
        else {
            return res.status(200).json(result);
        }
    }).populate('assignee submitter');
};


// Display detail page for a specific Ticket.
exports.ticket_detail = function(req, res) {
    Ticket.findById({'_id': req.params.id}, '_id subject description resources created_date due_date ticket_state assignee submitter requester', function (err, result) {
        if (err||!result) {
            return res.status(404).json({
                message: "Unable to get the ticket",
                error: err
            });
        }
        else {
            return res.status(200).json(result);
        }
    }).populate('assignee submitter');
};


// Ticket create on POST.
exports.ticket_create_post = function(req, res) {
    const data ={
        subject: req.body.subject,
        description: req.body.description,
        created_date: req.body.created_date,
        due_date: req.body.due_date,
        ticket_state: req.body.ticket_state,
        assignee: req.body.assignee,
        submitter: req.body.submitter,
        requester: req.body.requester
    };

    const rules = {
        subject: 'required',
        description: 'required',
        created_date: 'required|date',
        due_date: 'required|date',
        ticket_state: 'required|in:Open,Progressing,Done,Closed',
        assignee: 'required|alpha_numeric',
        submitter: 'required|alpha_numeric',
        requester: 'required'
    };

    validate(data, rules)
        .then(() => {
            let ticket = new Ticket ({
                subject: req.body.subject,
                description: req.body.description,
                created_date: req.body.created_date,
                due_date: req.body.due_date,
                ticket_state: req.body.ticket_state,
                assignee: req.body.assignee,
                submitter: req.body.submitter,
                requester: req.body.requester
            });
            ticket.save(function (err) {
                if (err) {
                    return res.status(304).json({
                        message: "Unable to create ticket",
                        error: err
                    });
                }
                return res.status(201).json({
                    message: "Created Successfully",
                    result: req.body
                });
            });
        })
        .catch((errors) => {
            return res.json(errors);
        });
};


// Ticket delete on DELETE.
exports.ticket_delete_post = function(req, res) {
    Ticket.findByIdAndDelete(req.params.id, function (err, result) {
        if (err||!result) {
            return res.status(304).json({
                message: "Unable to Delete Ticket",
                error: err
            });
        }
        else{
            return res.status(200).json({
                message: "Deleted Successfully",
                result: result
            })
        }
    });
};


// Ticket update on PATCH.
exports.ticket_update_post = function(req, res) {
    const data ={
        subject: req.body.subject,
        description: req.body.description,
        created_date: req.body.created_date,
        due_date: req.body.due_date,
        ticket_state: req.body.ticket_state,
        assignee: req.body.assignee,
        submitter: req.body.submitter,
        requester: req.body.requester
    };

    const rules = {
        subject: 'required',
        description: 'required',
        created_date: 'required|date',
        due_date: 'required|date',
        ticket_state: 'required|in:Open,Progressing,Done,Closed',
        assignee: 'required|alpha_numeric',
        submitter: 'required|alpha_numeric',
        requester: 'required'
    };

    validate(data, rules)
        .then(() => {
            Ticket.findByIdAndUpdate(req.params.id, req.body, function (err, result) {
                if (err||!result) {
                    return res.status(304).json({
                        message: "Unable to update Ticket",
                        error: err
                    });
                }
                else {
                    return res.status(200).json({
                        message: "Successfully Updated",
                        result: result
                    });
                }
            });
        })
        .catch((errors) => {
            return res.json(errors);
        });
};


// get tickets that user assigned for on GET
exports.getUserTickets = function(req, res) {
    userMiddleware.ticketsOfUser(req.params.userId, function(tickets) {
        Ticket.find({'_id': {$in: tickets}}, '_id subject description resources created_date due_date ticket_state assignee submitter requester', function (err, result) {
            if (err||!result) {
                return res.status(404).json({
                    message: "Unable to get tickets",
                    error: err
                });
            }
            return res.status(200).json(result);
        }).populate('assignee submitter');
    });
};



