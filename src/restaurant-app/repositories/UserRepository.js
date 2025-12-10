const database = require('../config/database');
const User = require('../models/User');

class UserRepository {
    constructor() {
        this.db = null;
        this.collection = null;
    }

    async getCollection() {
        if (!this.db) {
            this.db = await database.getDB();
            this.collection = this.db.collection('users');
        }
        return this.collection;
    }

    async create(userData) {
        try {
            const collection = await this.getCollection();
            const user = new User(userData);
            const errors = await user.validate();
            
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }
            
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
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    async findByUsername(username) {
        try {
            const collection = await this.getCollection();
            const userData = await collection.findOne({ username });
            if (!userData) return null;
            return new User(userData);
        } catch (error) {
            throw new Error(`Find user failed: ${error.message}`);
        }
    }

    async findById(id) {
        try {
            const collection = await this.getCollection();
            const userData = await collection.findOne({ _id: id });
            if (!userData) return null;
            return new User(userData);
        } catch (error) {
            throw new Error(`Find user failed: ${error.message}`);
        }
    }

    async update(id, updateData) {
        try {
            const collection = await this.getCollection();
            updateData.updated_at = new Date();
            const result = await collection.updateOne(
                { _id: id },
                { $set: updateData }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`User update failed: ${error.message}`);
        }
    }

    async addFavorite(userId, restaurantId) {
        try {
            const collection = await this.getCollection();
            const result = await collection.updateOne(
                { _id: userId },
                { $addToSet: { favorites: restaurantId } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Add favorite failed: ${error.message}`);
        }
    }

    async removeFavorite(userId, restaurantId) {
        try {
            const collection = await this.getCollection();
            const result = await collection.updateOne(
                { _id: userId },
                { $pull: { favorites: restaurantId } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Remove favorite failed: ${error.message}`);
        }
    }
}

module.exports = UserRepository;
