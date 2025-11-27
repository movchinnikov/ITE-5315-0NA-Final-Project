const jwt = require('jsonwebtoken');

class AuthService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access_secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
        this.userRepository = null;
    }

    getUserRepository() {
        if (!this.userRepository) {
            const UserRepository = require('../repositories/userRepository');
            this.userRepository = new UserRepository();
        }
        return this.userRepository;
    }

    generateAccessToken(user) {
        return jwt.sign(
            { userId: user._id.toString(), username: user.username },
            this.accessTokenSecret,
            { expiresIn: '15m' }
        );
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { userId: user._id.toString(), username: user.username },
            this.refreshTokenSecret,
            { expiresIn: '7d' }
        );
    }

    async register(userData) {
        try {
            const userRepository = this.getUserRepository();
            const user = await userRepository.createUser(userData);
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            return {
                user: JSON.parse(JSON.stringify(user)),
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error(`Auth service error: ${error.message}`);
        }
    }

    async login(username, password) {
        try {
            const userRepository = this.getUserRepository();
            const user = await userRepository.findByUsername(username);
            if (!user) {
                throw new Error('Invalid username or password');
            }

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new Error('Invalid username or password');
            }

            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            return {
                user: JSON.parse(JSON.stringify(user)),
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error(`Auth service error: ${error.message}`);
        }
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret);
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshTokenSecret);
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    async refreshTokens(refreshToken) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);
            const userRepository = this.getUserRepository();
            const user = await userRepository.findById(decoded.userId);

            if (!user) {
                throw new Error('User not found');
            }

            const accessToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            return {
                accessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            throw new Error(`Token refresh error: ${error.message}`);
        }
    }
}

module.exports = AuthService;