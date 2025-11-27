const database = require('../config/database');
const User = require('../models/User');

class UserRepository {
    constructor() {
        this.db = null;
        this.collection = null;
    }

    getCollection() {
        if (!this.db) {
            this.db = database.getDB();
            this.collection = this.db.collection('users');
        }
        return this.collection;
    }

    async createUser(userData) {
        try {
            const collection = this.getCollection();
            const user = new User(userData);
            const errors = await user.validate();

            if (errors.length > 0) {
                throw new Error(`Invalid user data: ${errors.join(', ')}`);
            }

            // Check if username already exists
            const existingUser = await collection.findOne({ 
                username: user.username 
            });

            if (existingUser) {
                throw new Error('Username already exists');
            }

            await user.hashPassword();

            const result = await collection.insertOne(user);
            return { ...user.toJSON(), _id: result.insertedId };
        } catch (error) {
            throw new Error(`User repository error: ${error.message}`);
        }
    }

    async findByUsername(username) {
        try {
            const collection = this.getCollection();
            const userData = await collection.findOne({ username });
            if (!userData) return null;

            const user = new User(userData);
            return user;
        } catch (error) {
            throw new Error(`User repository error: ${error.message}`);
        }
    }

    async findById(userId) {
        try {
            const collection = this.getCollection();
            const userData = await collection.findOne({ _id: userId });
            if (!userData) return null;

            const user = new User(userData);
            return user;
        } catch (error) {
            throw new Error(`User repository error: ${error.message}`);
        }
    }
}

module.exports = UserRepository;