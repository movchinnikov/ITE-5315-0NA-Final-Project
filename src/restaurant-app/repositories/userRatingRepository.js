const database = require('../config/database');
const UserRating = require('../models/UserRating');

class UserRatingRepository {
    constructor() {
        this.db = database.getDB();
        this.collection = this.db.collection('user_ratings');
    }

    async createRating(ratingData) {
        try {
            const rating = new UserRating(ratingData);
            
            if (!rating.isValid()) {
                throw new Error(`Invalid rating data: ${rating.validate().join(', ')}`);
            }

            // Check if user already rated this restaurant
            const existingRating = await this.collection.findOne({
                restaurant_id: rating.restaurant_id,
                user_id: rating.user_id
            });

            if (existingRating) {
                throw new Error('You have already rated this restaurant');
            }

            const result = await this.collection.insertOne(rating);
            return { ...rating, _id: result.insertedId };
        } catch (error) {
            throw new Error(`Rating repository error: ${error.message}`);
        }
    }

    async getAverageRating(restaurantId) {
        try {
            const result = await this.collection.aggregate([
                { $match: { restaurant_id: restaurantId } },
                { $group: { _id: '$restaurant_id', average: { $avg: '$score' } } }
            ]).toArray();

            return result.length > 0 ? Math.round(result[0].average) : null;
        } catch (error) {
            throw new Error(`Rating repository error: ${error.message}`);
        }
    }

    async getRatingsByRestaurant(restaurantId) {
        try {
            const ratings = await this.collection
                .find({ restaurant_id: restaurantId })
                .sort({ created_at: -1 })
                .toArray();
            
            return ratings;
        } catch (error) {
            throw new Error(`Rating repository error: ${error.message}`);
        }
    }
}

module.exports = UserRatingRepository;