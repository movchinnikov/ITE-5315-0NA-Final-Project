const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');

class AuthService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'jwt-access-secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'jwt-refresh-secret';
        this.userRepository = new UserRepository();
    }

    generateAccessToken(user) {
        var token = jwt.sign(
            { 
                userId: user._id.toString(), 
                username: user.username,
                role: user.role 
            },
            this.accessTokenSecret,
            { expiresIn: '15m' }
        );
        console.log(token);
        console.log(this.accessTokenSecret);
        return token;
    }

    generateRefreshToken(user) {
        return jwt.sign(
            { userId: user._id.toString() },
            this.refreshTokenSecret,
            { expiresIn: '7d' }
        );
    }

    async register(userData) {
        try {
            const user = await this.userRepository.create(userData);
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            return {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    created_at: user.created_at,
                    favorites: user.favorites
                },
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async login(username, password) {
        try {
            const user = await this.userRepository.findByUsername(username);
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
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    created_at: user.created_at,
                    favorites: user.favorites
                },
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
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
            const user = await this.userRepository.findById(decoded.userId);

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
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    async getCurrentUser(userId) {
        try {
            return await this.userRepository.findById(userId);
        } catch (error) {
            throw new Error(`Get user failed: ${error.message}`);
        }
    }
}

module.exports = AuthService;
