const jwt = require('jsonwebtoken');


exports.authorization = function(isSupervisor) {
    var middleware = function (req, res, next) {
        // Check header for token
        let token = req.headers['x-access-token'];
        console.log("isSupervisor: "+ isSupervisor);
        // Check if token has been sent.
        if (token) {
            // Verify token. The role is read from the verified payload only. jwt.verify can throw as
            // well as report an error (a correctly signed token with a null payload makes it throw),
            // so it runs in a try/catch and anything it cannot verify is rejected. next() stays
            // outside the try, so an error from a route handler is never mistaken for a bad token.
            let decoded = null;
            try {
                decoded = jwt.verify(token, 'secret');
            } catch (err) {
                decoded = null;
            }
            if (!decoded || (isSupervisor && decoded.type!=='Supervisor')) {
                // Invalid token
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorised User'
                });
            }
            // If everything is good, save to request for use in other routes
            console.log("all good");
            req.decoded = decoded;
            return next();
        }
        else {
            // No token
            return res.status(403).json({
                success: false,
                message: 'Unauthorised'
            });
        }
    };
    return middleware;
};





