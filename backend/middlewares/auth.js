const dotenv = require('dotenv');
// Load environment variables
dotenv.config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Auth Middleware
const auth = (req, res, next) => {
    // const token = req.header('x-auth-token');
    const token = req.cookies.userCookie;
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = auth;