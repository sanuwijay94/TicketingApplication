const express = require('express');
const router = express.Router();
const Login = require('../middleware/login')

//LOGIN.
router.post('/', Login.login);


module.exports = router;
