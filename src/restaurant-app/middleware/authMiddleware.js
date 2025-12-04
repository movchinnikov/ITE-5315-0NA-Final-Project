// middleware/auth.js
let authService = null;

function getAuthService() {
    if (!authService) {
        const AuthService = require('../services/authService');
        authService = new AuthService();
    }
    return authService;
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const service = getAuthService();
        const decoded = service.verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAuth
};