const jwt = require('jsonwebtoken');


exports.authorization = function(isSupervisor) {
    var middleware = function (req, res, next) {
        // Check header for token
        let token = req.headers['x-access-token'];
        console.log("isSupervisor: "+ isSupervisor);
        // Check if token has been sent.
        if (token) {
            // Verify token. The role is read from the verified payload only: jwt.decode returns null
            // (or throws) for anything that is not a well-formed JWT, which used to crash this guard
            // and turn a bad token into a 500 instead of a 403.
            jwt.verify(token, 'secret', (err, decoded) => {
                if (err||(isSupervisor && decoded.type!=='Supervisor')) {
                    // Invalid token
                    return res.status(403).json({
                        success: false,
                        message: 'Unauthorised User'
                    });
                }
                else {
                    // If everything is good, save to request for use in other routes
                    console.log("all good");
                    req.decoded = decoded;
                    return next();
                }
            });
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





