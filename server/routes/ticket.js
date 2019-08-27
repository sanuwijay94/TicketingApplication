const express = require('express');
const router = express.Router({mergeParams: true});
const authentication = require('../authentication');
const ticket = require('../controllers/ticketController');


/// Ticket ROUTES ///

// POST request for creating Ticket.
router.post('/create', authentication.all, ticket.ticket_create_post);//all

// DELETE request to delete Ticket.
router.delete('/:id/delete', authentication.onlySupervisor, ticket.ticket_delete_post);//admin

// PATCH request to update Ticket.
router.patch('/:id/update', authentication.all, ticket.ticket_update_post);//all

// GET request for one Ticket.
router.get('/:id', authentication.all, ticket.ticket_detail);//all

// GET request for list of all Tickets.
router.get('/',authentication.all, ticket.ticket_list);//all


module.exports = router;