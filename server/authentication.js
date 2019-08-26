const jwt = require('jsonwebtoken');


exports.onlyAdmin = function(req, res, next) {
    // Check header for token
    let token = req.headers['x-access-token'];

    // Check if token has been sent
    if (token) {
        //Get user type from token
        let type = token.slice(-1);
        console.log(type);
        token = token.slice(0, -1);

        // Verify token
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err||type!=='A') {
                // Invalid token
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorised User'
                });
            }
            else {
                // If everything is good, save to request for use in other routes
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


exports.onlyAdminAndPM = function(req, res, next) {
    // Check header for token
    let token = req.headers['x-access-token'];

    // Check if token has been sent
    if (token) {
        //Get user type from token
        let type =token.slice(-1);
        console.log(type);
        token = token.slice(0, -1);

        // Verify token
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err||(type!=='A'&&type!=='P')) {
                // Invalid token
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorised User'
                });
            }
            else {
                // If everything is good, save to request for use in other routes
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


exports.all = function(req, res, next) {
    // Check header for token
    let token = req.headers['x-access-token'];

    // Check if token has been sent
    if (token) {
        //Get user type from token
        let type = token.slice(-1);
        console.log(type);
        token = token.slice(0, -1);

        // Verify token
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err) {
                // Invalid token
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorised User'
                });
            }
            else {
                // If everything is good, save to request for use in other routes
                req.decoded = decoded;
                return next();
            }
        });
    }
    else {
        // No token
        return res.status(401).json({
            success: false,
            message: 'Unauthorised'
        });
    }
};


