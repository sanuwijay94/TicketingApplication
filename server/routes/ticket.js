const express = require('express');
const router = express.Router({mergeParams: true});
const authentication = require('../authentication');
const ticket = require('../controllers/ticketController');
const supervisor = true;
const agent = false;


/// Ticket ROUTES ///

// POST request for creating Ticket.
router.post('/create', authentication.authorization(agent), ticket.ticket_create_post);//all

// DELETE request to delete Ticket.
router.delete('/:id/delete', authentication.authorization(supervisor), ticket.ticket_delete_post);//supervisor

// PATCH request to update Ticket.
router.patch('/:id/update', authentication.authorization(agent), ticket.ticket_update_post);//all

// GET request for one Ticket.
router.get('/:id', authentication.authorization(agent), ticket.ticket_detail);//all

// GET request for list of all Tickets.
router.get('/',authentication.authorization(agent), ticket.ticket_list);//all


module.exports = router;