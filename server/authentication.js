const jwt = require('jsonwebtoken');


exports.authorization = function(isSupervisor) {
    var middleware = function (req, res, next) {
        // Check header for token
        let token = req.headers['x-access-token'];
        console.log("isSupervisor: "+ isSupervisor);
        // Check if token has been sent.
        if (token) {
            //Get user type from token
            const decoded = jwt.decode(token, {complete: true});
            const type = decoded.payload.type;
            // Verify token
            jwt.verify(token, 'secret', (err, decoded) => {
                if (err||(isSupervisor && type!=='Supervisor')) {
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





