console.log('This script populates some test Ticket, User to your database. Specified database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url');

// Get arguments passed on command line
const userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

const async = require('async');
const Ticket = require('./models/ticket');
const User = require('./models/user');

const mongoose = require('mongoose');
const mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

const tickets = [];
const users = [];

function ticketCreate(cb) {
    const ticket = new Ticket({
        subject: 'Add feature',
        description: 'sldjn vnwpvn wvwnv wvwnvpw wvnwpvnw',
        created_date: '2018-07-30',
        due_date: '2018-08-30',
        ticket_state: 'Progressing',
        assignee: users[0],
        submitter: users[1],
        requester: '0713872266'
    });
    const ticket1 = new Ticket({
        subject: 'Bug fix',
        description: 'nhjtdjn vklugn ugnv wykhvw ssdjapvnw',
        created_date: '2018-08-26',
        due_date: '2018-09-10',
        ticket_state: 'Open',
        assignee: users[0],
        submitter: users[1],
        requester: '0773845667'
    });
    ticket.save( function (err)
    {
        if (err) {
            cb('ticket', null);
            return;
        }
        ticket1.save( function (err)
        {
            if (err) {
                cb('ticket1', null);
                return;
            }
            console.log('New Ticket1: ' + ticket1);
            tickets.push(ticket);
            console.log('New Ticket2: ' + ticket);
            tickets.push(ticket1);
            cb(null, ticket)
        });

    })
}
function userCreate(cb) {
    const user = new User({
        first_name: 'sanura',
        last_name: 'wijayarathne',
        date_of_birth: '1994-06-14',
        phone: '0771236703',
        email: 'sanura@gmail.com',
        type: 'Supervisor',
        username: 'sanuwijay94',
        password: '123'
    });
    const user1 = new User({
        first_name: 'dinura',
        last_name: 'wijayarathne',
        date_of_birth: '1994-06-13',
        phone: '077193745',
        email: 'dinura@gmail.com',
        type: 'Agent',
        username: 'dinur-el',
        password: 'abc'
    });
    user.save(function (err) {
        if (err) {
            cb('user1', null);
            return;
        }
        user1.save(function (err) {
            if (err) {
                cb('user2', null);
                return;
            }
            console.log('New User1: ' + user1);
            users.push(user1);
            console.log('New User2: ' + user);
            users.push(user);
            cb(null, user);
        });
    });
}


function createUser(cb) {
    async.parallel([
        function(callback) {
            userCreate(callback);
        }
    ],
    // optional callback
    cb);
}

function createTicket(cb) {
    async.parallel([
        function(callback) {
            ticketCreate(callback);
        }
    ],
    // optional callback
    cb);
}

async.series([
        createUser,
        createTicket
    ],
// Optional callback
    function(err, results) {
        if (err) {
            console.log('FINAL ERR: '+err);
        }
        else {
            console.log('All done');
        }
        // All done, disconnect from database
        mongoose.connection.close();
    });



