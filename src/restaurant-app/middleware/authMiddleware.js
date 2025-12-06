let authService = null;

function getAuthService() {
    if (!authService) {
        const AuthService = require('../services/authService');
        authService = new AuthService();
    }
    return authService;
}

// middleware/auth.js
const authenticateToken = (req, res, next) => {
    console.log('=== Authentication Check ===');
    
    let token = null;
    
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('Token from Authorization header');
    }
    
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie;
        
        const match = cookies.match(/accessToken=([^;]+)/);
        if (match) {
            token = match[1];
            console.log('Token extracted from cookie:', token.substring(0, 20) + '...');
        } else {
            console.log('No accessToken found in cookies');
        }
    }
    
    if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
        console.log('Token from req.cookies (cookie-parser)');
    }
    
    if (!token) {
        console.log('No token found anywhere');
        req.user = null;
        return next();
    }
    
    try {
        const service = getAuthService();
        const decoded = service.verifyAccessToken(token);
        console.log('Token valid, user:', decoded.username);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token invalid:', error.message);
        req.user = null;
        next();
    }
};

const requireAuth = (req, res, next) => {
    console.log('=== requireAuth middleware ===');
    console.log('req.user:', req.user);
    
    if (!req.user) {
        console.log('User not authenticated, returning 401');
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    console.log('User authenticated:', req.user);
    next();
};

module.exports = {
    authenticateToken,
    requireAuth
};