const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const AuthService = require('../services/AuthService');

const router = express.Router();
const authService = new AuthService();

router.post('/register', async (req, res) => {
    try {
        if (!req.body.username || !req.body.password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        const result = await authService.register(req.body);
        res.json({
            success: true,
            message: 'Registration successful',
            ...result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
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

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
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

router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = router;