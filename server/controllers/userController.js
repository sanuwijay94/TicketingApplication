const User = require('../models/user');
const userMiddleware = require('../middleware/user');
const { validate } = require('indicative');

// Display list of all User.
exports.user_list = function(req, res) {
    User.find({}, '_id first_name last_name date_of_birth phone email type username password', function (err, result) {
        if (err) {
            return res.json({
                message: "Unable to get all user",
                error: err
            });
        }
        else {
            return res.json(result);
        }
    });
};


// Display detail page for a specific User.
exports.user_detail = function(req, res) {
    User.findById({'_id': req.params.id}, '_id first_name last_name date_of_birth phone email type username password', function (err, result) {
        if (err) {
            return res.json({
                message: "Unable to get the user",
                error: err
            });
        }
        else {
            return res.json(result);
        }
    });
};


// User create on POST.
exports.user_create_post = function(req, res) {
    const data ={
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        date_of_birth: req.body.date_of_birth,
        phone: req.body.phone,
        email: req.body.email,
        type: req.body.type,
        username: req.body.username,
        password: req.body.password
    };

    const rules = {
        first_name: 'required',
        last_name: 'required',
        date_of_birth: 'date',
        phone: 'required',
        email: 'email',
        type: 'required|in:Supervisor,Agent',
        username: 'required',
        password: 'required|min:4|max:40'
    };

    const messages = {
        required: (field) => `${field} is required`,
        'username.alpha': 'Username contains unallowed characters',
        'email.email': 'Please enter a valid email address',
        'password.min': 'Password is too short',
    };

    validate(data, rules, messages)
        .then(() => {
            const user = new User({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                date_of_birth: req.body.date_of_birth,
                phone: req.body.phone,
                email: req.body.email,
                type: req.body.type,
                username: req.body.username,
                password: req.body.password
            });
            user.save(function (err) {
                if (err) {
                    return res.status(304).json({
                        message: "Unable to Create User",
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


// User delete on DELETE.
exports.user_delete_post = function(req, res) {
    User.findByIdAndDelete(req.params.id, function (err, result) {
        if (err||!result) {
            return res.status(304).json({
                message: "Unable to Delete User",
                error: err
            });
        }
        //getting all the tickets of user with the passed user Id
        userMiddleware.ticketsOfUser(req.params.id, function(tickets) {
            if (err||!result) {
                return res.status(304).json({
                    message: "Unable to Delete Tickets",
                    error: err
                });
            }
            //delete the user Id from all the tickets
            for(let i=0; i<tickets.length; i++) {
                userMiddleware.deleteUserFromTicket(tickets[i]);
            }
            return res.status(200).json({
                message: "Deleted Successfully",
            });
        });
    });
};


// User update on PATCH.
exports.user_update_post = function(req, res) {
    const data ={
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        date_of_birth: req.body.date_of_birth,
        phone: req.body.phone,
        email: req.body.email,
        type: req.body.type,
        username: req.body.username,
        password: req.body.password
    };

    const rules = {
        first_name: 'required',
        last_name: 'required',
        date_of_birth: 'date',
        phone: 'required',
        email: 'email',
        type: 'required|in:Supervisor,Agent',
        username: 'required',
        password: 'required|min:4|max:40'
    };

    const messages = {
        required: (field) => `${field} is required`,
        'username.alpha': 'Username contains unallowed characters',
        'email.email': 'Please enter a valid email address',
        'password.min': 'Password is too short',
    };

    validate(data, rules, messages)
        .then(() => {
            User.findByIdAndUpdate(req.params.id, req.body, function (err, result) {
                if (err||!result) {
                    return res.status(304).json({
                        message: "Unable to update User",
                        error: err
                    });
                }
                return res.status(200).json({
                    message: "Updated Successfully",
                    result: result
                });
            });
        })
        .catch((errors) => {
            return res.json(errors);
        });
};

