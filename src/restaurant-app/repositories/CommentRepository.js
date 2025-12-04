const database = require('../config/database');
const Comment = require('../models/Comment');

class CommentRepository {
    constructor() {
        this.db = null;
        this.collection = null;
    }

    async getCollection() {
        if (!this.db) {
            this.db = await database.getDB();
            this.collection = this.db.collection('comments');
        }
        return this.collection;
    }

    async create(commentData) {
        try {
            const collection = await this.getCollection();
            const comment = new Comment(commentData);
            const errors = comment.validate();
            
            if (errors.length > 0) {
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }
            
            const result = await collection.insertOne(comment);
            return { ...comment.toJSON(), _id: result.insertedId };
        } catch (error) {
            throw new Error(`Comment creation failed: ${error.message}`);
        }
    }

    async findByRestaurantId(restaurantId, page = 1, limit = 10) {
        try {
            const collection = await this.getCollection();
            const skip = (page - 1) * limit;
            
            const [comments, total] = await Promise.all([
                collection.find({ restaurant_id: restaurantId })
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                collection.countDocuments({ restaurant_id: restaurantId })
            ]);
            
            return {
                comments: comments.map(c => new Comment(c).toJSON()),
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        } catch (error) {
            throw new Error(`Find comments failed: ${error.message}`);
        }
    }

    async update(id, updateData) {
        try {
            const collection = await this.getCollection();
            updateData.updated_at = new Date();
            updateData.is_edited = true;
            
            const result = await collection.updateOne(
                { _id: id },
                { $set: updateData }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Comment update failed: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            const collection = await this.getCollection();
            const result = await collection.deleteOne({ _id: id });
            return result.deletedCount > 0;
        } catch (error) {
            throw new Error(`Comment deletion failed: ${error.message}`);
        }
    }
}

module.exports = CommentRepository;