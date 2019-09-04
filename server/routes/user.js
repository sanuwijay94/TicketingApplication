const express = require('express');
const router = express.Router();
const authentication = require('../authentication');
const user = require('../controllers/userController');
const ticket = require('../controllers/ticketController');
const supervisor = true;
const agent = false;

/// User ROUTES ///

// POST request for creating User.
router.post('/create', /*authentication.all,*/ user.user_create_post);//all

// DELETE request to delete User.
router.delete('/:id/delete', authentication.authorization(supervisor), user.user_delete_post);//Supervisor

// PATCH request to update User.
router.patch('/:id/update', authentication.authorization(agent), user.user_update_post);//all

// GET request for one User.
router.get('/:id', authentication.authorization(agent), user.user_detail);//all

// GET request for list of all User.
router.get('/', authentication.authorization(agent), user.user_list);//all

// GET Tickets of User
router.get('/:id/tickets', authentication.authorization(agent), ticket.getUserTickets);//all

// GET Ticket of User
//router.get('/:userId/tickets/:id', authentication.all, ticket.ticket_detail);//all

module.exports = router;