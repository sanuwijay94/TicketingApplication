const jwt = require('jsonwebtoken');
const User = require('../models/user');

foundUser=function(req, res, user){
    // Wrong password
    if (user.password !== req.body.password) {
        res.status(401).json({
            success: false,
            message: ' Invalid password. '
        });
    }
    // Correct Password
    else {
        const tokenDetails = {
            username: user.username,
            type: user.type
        };
        // Create token
        let token = jwt.sign(tokenDetails, 'secret', {
            expiresIn: '50m'
        });

        //console.log(result);
        return res.json({
            success: true,
            message: 'Successfully logged in',
            token: token,
            user: user
        });
    }
};


exports.login = function(req, res) {
    User.findOne({username: req.body.username}, '_id username password type ', function (err, user){
        //User not found
        if (err || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Username'
            });
        }
        else {
            foundUser(req, res, user)
        }
    });
};




