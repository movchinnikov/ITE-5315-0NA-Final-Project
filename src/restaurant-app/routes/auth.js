const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function getAuthService() {
    const AuthService = require('../services/authService');
    return new AuthService();
}

// Register
router.post('/register', async (req, res) => {
    try {
        const authService = getAuthService();
        const result = await authService.register(req.body);
        res.json({
            success: true,
            message: 'User registered successfully',
            ...result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const authService = getAuthService();
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        res.json({
            success: true,
            message: 'Login successful',
            ...result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

// Refresh tokens
router.post('/refresh', async (req, res) => {
    try {
        const authService = getAuthService();
        const { refreshToken } = req.body;
        const result = await authService.refreshTokens(refreshToken);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.json({
            success: true,
            user: null
        });
    }

    res.json({
        success: true,
        user: req.user
    });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;