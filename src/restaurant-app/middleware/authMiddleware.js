let authService = null;

function getAuthService() {
    if (!authService) {
        const AuthService = require('../services/authService');
        authService = new AuthService();
    }
    return authService;
}

const authenticateToken = (req, res, next) => {
    console.log('=== authenticateToken middleware ===');
    const authHeader = req.headers['authorization'];
    console.log('Authorization header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    
    if (!token) {
        console.log('No token found, setting user = null');
        req.user = null;
        return next();
    }

    try {
        const service = getAuthService();
        console.log('Verifying token with authService...');
        
        const decoded = service.verifyAccessToken(token);
        console.log('Token verified successfully:', decoded);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        console.error('Error stack:', error.stack);
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