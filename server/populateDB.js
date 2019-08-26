console.log('This script populates some test Projects, Employees, Clients, Phases, Tasks, Resources and Admins to your database. Specified database as argument - e.g.: populatedb mongodb://your_username:your_password@your_dabase_url');

// Get arguments passed on command line
const userArgs = process.argv.slice(2);
if (!userArgs[0].startsWith('mongodb://')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}

const async = require('async');
const Project = require('./models/project');
const Employee = require('./models/employee');
const Resource = require('./models/resource');
const Client = require('./models/client');
const Phase = require('./models/phase');
const Task = require('./models/task');
const Admin = require('./models/admin');



const mongoose = require('mongoose');
const mongoDB = userArgs[0];
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

const projects = [];
const employees = [];
const resources = [];
const clients = [];
const phases = [];

function projectCreate(cb) {
    const project = new Project({
        name: 'Project Management',
        type: 'IT',
        start_date: '2017-06-06',
        deadline: '2018-02-06',
        budget: 45000,
        percentage_complete: 40.5,
        client: clients[0],
        employees: employees,
        resources: resources
    });
    const project1 = new Project({
        name: 'Crop Management',
        type: 'Agriculture',
        start_date: '2017-11-16',
        deadline: '2018-07-22',
        budget: 85000,
        percentage_complete: 25.5,
        client: clients[1],
        employees: [],
        resources: []
    });
    project.save( function (err)
    {
        if (err) {
            cb('project', null);
            return;
        }
        project1.save( function (err)
        {
            if (err) {
                cb('project1', null);
                return;
            }
            console.log('New Project1: ' + project1);
            projects.push(project);
            console.log('New Project2: ' + project);
            projects.push(project1);
            cb(null, project)
        });

    })
}
function employeeCreate(cb) {
    const employee = new Employee({
        first_name: 'sanura',
        last_name: 'wijayarathne',
        date_of_birth: '',
        phone: '0771234563',
        email: 'sanura@gmail.com',
        type: 'Dev',
        status: 'Not-Available',
        username: 'sanuwijay94',
        password: '123'
    });
    const employee1 = new Employee({
        first_name: 'dinura',
        last_name: 'wijayarathne',
        date_of_birth: '',
        phone: '077193745',
        email: 'dinura@gmail.com',
        type: 'PM',
        status: 'Not-Available',
        username: 'dinur-el',
        password: 'dinu'
    });
    employee.save(function (err) {
        if (err) {
            cb('employee1', null);
            return;
        }
        employee1.save(function (err) {
            if (err) {
                cb('employee2', null);
                return;
            }
            console.log('New Employee1: ' + employee1);
            employees.push(employee1);
            console.log('New Employee2: ' + employee);
            employees.push(employee);
            cb(null, employee);
        });
    });
}

function resourceCreate(cb) {
    const resource = new Resource({
        name: 'server',
        type: 'facilities',
        status: 'Not-Available'
    });
    const resource1 = new Resource({
        name: 'server',
        type: 'facilities',
        status: 'Available'
    });
    resource.save(function (err) {
        if (err) {
            cb('resource', null);
            return
        }
        resource1.save(function (err) {
            if (err) {
                cb('resource1', null);
                return
            }
            console.log('New Resource1 ' + resource1);
            resources.push(resource1);
            console.log('New Resource2' + resource);
            resources.push(resource);
            cb(null, resource);
        });
    });
}


function clientCreate(cb) {
    const client = new Client({
        name: 'WHO',
        type: 'Organization',
        phone: '0729375832',
        email: 'who@gmail.com',
        username: 'WHO2018',
        password: 'who123'
    });
    const client1 = new Client({
        name: 'Christiano Ronaldo',
        type: 'Person',
        phone: '0729322232',
        email: 'ronaldo@gmail.com',
        username: 'ronaldo',
        password: '07'
    });
    client.save(function (err) {
        if (err) {
            cb('client1', null);
            return
        }
        client1.save(function (err) {
            if (err) {
                cb('client2', null);
                return
            }
            console.log('New Client1: ' + client);
            clients.push(client);
            console.log('New Client2: ' + client1);
            clients.push(client1);
            cb(null, client);
        });
    });
}


function phaseCreate(cb) {
    const phase = new Phase({
        name: 'Requirement gathering',
        start_date: '2017-06-06',
        end_date: '',
        project: projects[0]
    });
    const phase1 = new Phase({
        name: 'Requirement analysis',
        start_date: '2017-08-06',
        end_date: '',
        project: projects[0]
    });
    phase.save(function (err) {
        if (err) {
            cb('phase', null);
            return
        }
        phase1.save(function (err) {
            if (err) {
                cb('phase1', null);
                return
            }
            console.log('New Phase1 ' + phase);
            phases.push(phase);
            console.log('New Phase2 ' + phase1);
            phases.push(phase1);
            cb(null, phase)
        });

    });
}


function taskCreate(cb) {
    const task = new Task({
        description: 'Create Models',
        employee: employees[0],
        phase: phases[0],
        status: 'completed'
    });
    const task1 = new Task({
        description: 'Create login UI',
        employee: employees[1],
        phase: phases[0],
        status: 'on-going'
    });
    const task2 = new Task({
        description: 'Create registration',
        employee: employees[0],
        phase: phases[1],
        status: 'on-going'
    });
    task.save(function (err) {
        if (err) {
            cb('task1', null);
            return
        }
        task1.save(function (err) {
            if (err) {
                cb('task2', null);
                return
            }
            task2.save(function (err) {
                if (err) {
                    cb('task3', null);
                    return
                }
                console.log('New Task1 ' + task);
                console.log('New Task2 ' + task1);
                console.log('New Task3 ' + task2);
                cb(null, task)
            });
        });
    });
}


function adminCreate(cb) {
    console.log('admin create');
    const admin = new Admin({
        username: 'admin',
        password: 'admin',
        type: 'admin'
    });
    admin.save(function (err) {
        if (err) {
            cb('admin', null);
            return
        }
        console.log('New Admin: ' + admin);
        cb(null, admin);
    });
}


function createEmployeeClientResourceAdmin(cb) {
    async.parallel([
            function(callback) {
                employeeCreate(callback);
            },
            function(callback) {
                clientCreate(callback);
            },
            function(callback) {
                resourceCreate(callback);
            },
            function(callback) {
                adminCreate(callback);
            }
        ],
        // optional callback
        cb);
}

function createProject(cb) {
    async.parallel([
        function(callback) {
            projectCreate(callback);
        }
    ],
    // optional callback
    cb);
}

function createPhase(cb) {
    async.parallel([
            function(callback) {
                phaseCreate(callback);
            }
        ],
        // Optional callback
        cb);
}

function createTask(cb) {
    async.parallel([
            function(callback) {
                taskCreate(callback);
            }
        ],
        // Optional callback
        cb);
}


async.series([
        createEmployeeClientResourceAdmin,
        createProject,
        createPhase,
        createTask
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



