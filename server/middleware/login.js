const jwt = require('jsonwebtoken');
const User = require('../models/user');

foundUser=function(req, res, user){
    // Wrong password
    if (user.password !== req.body.password) {
        res.status(401).json({
            success: false,
            message: 'Authentication failed. Wrong password.'
        });
    }
    // Correct Password
    else {
        const tokenDetails = {
            username: user.username,
            name: user.first_name
        };
        // Create token
        let token = jwt.sign(tokenDetails, 'secret', {
            expiresIn: '50m'
        });
        //add user type for the token
        switch(user.type) {
            case 'Supervisor':
                token = token+'S';
                console.log('Supervisor');
                break;
            case 'Agent':
                token = token+'A';
                console.log('Agent');
                break;
            default:
                console.log('no type');
                return res.json({
                    error: 'User type not found',
                });
        }
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
                error: 'User not found'
            });
        }
        else {
            foundUser(req, res, user)
        }
    });
};




