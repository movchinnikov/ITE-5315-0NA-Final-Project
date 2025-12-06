const { ObjectId } = require('mongodb');
const Restaurant = require('../models/Restaurant');

class RestaurantRepository {
    constructor(db) {
        this.db = db;
        this.collection = db.collection('restaurants');
        this.neighborhoodsCollection = db.collection('neighborhoods');
    }

    async cacheNeighborhoods() {
        try {
            const neighborhoods = await this.neighborhoodsCollection.find({}).toArray();
            return neighborhoods.map(n => n.name).filter(name => name).sort();
        } catch (error) {
            return [];
        }
    }

    async cacheCuisines() {
        try {
            const cuisines = await this.collection.distinct('cuisine');
            return cuisines.filter(c => c).sort();
        } catch (error) {
            return [];
        }
    }

    async findAll(query = {}, page = 1, limit = 12) {
        try {
            if (query.name !== undefined && query.name !== null) {
                const nameValue = String(query.name).trim();
                
                if (nameValue === '') {
                    query.name = { $exists: true, $ne: "" };
                }
            } else {
                query.name = { $exists: true, $ne: "" };
            }

            const skip = (page - 1) * limit;
            
            const [restaurants, totalCount] = await Promise.all([
                this.collection
                    .find(query)
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(query)
            ]);

            const restaurantModels = restaurants.map(r => new Restaurant(r));

            return {
                restaurants: restaurantModels.map(r => r.toJSON()).filter(r => r !== null),
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page
            };
        } catch (error) {
            throw new Error(`Find restaurants failed: ${error.message}`);
        }
    }

    async findByNeighborhood(neighborhoodName, query = {}, page = 1, limit = 12) {
        try {
            const neighborhood = await this.neighborhoodsCollection.findOne({
                name: neighborhoodName
            });

            if (!neighborhood) {
                return { restaurants: [], totalCount: 0, totalPages: 0, currentPage: page };
            }

            const geoQuery = {
                'address.coord': {
                    $geoWithin: {
                        $geometry: neighborhood.geometry
                    }
                }
            };

            const finalQuery = { ...geoQuery, ...query };

            if (query.name !== undefined && query.name !== null) {
                const nameValue = String(query.name).trim();
                
                if (nameValue === '') {
                    query.name = { $exists: true, $ne: "" };
                }
            } else {
                query.name = { $exists: true, $ne: "" };
            }

            const skip = (page - 1) * limit;

            const [restaurants, totalCount] = await Promise.all([
                this.collection
                    .find(finalQuery)
                    .sort({ name: 1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                this.collection.countDocuments(finalQuery)
            ]);

            const restaurantModels = restaurants.map(r => new Restaurant(r));

            return {
                restaurants: restaurantModels.map(r => r.toJSON()).filter(r => r !== null),
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page
            };
        } catch (error) {
            throw new Error(`Find restaurants by neighborhood failed: ${error.message}`);
        }
    }

    async findById(id, withComments = true) {
        try {
            let restaurant = null;

            try {
                restaurant = await this.collection.findOne({ _id: new ObjectId(id) });
            } catch (e) {
                return null;
            }

            if (!restaurant) return null;

            const restaurantModel = new Restaurant(restaurant);
            
            if (!withComments) {
                return restaurantModel;
            }
            
            return restaurantModel;
        } catch (error) {
            throw new Error(`Find restaurant by ID failed: ${error.message}`);
        }
    }

    async searchByName(searchTerm, page = 1, limit = 12) {
        try {
            const query = {
                name: { 
                    $regex: searchTerm, 
                    $options: 'i',
                    $exists: true,
                    $ne: null,
                    $ne: ""
                }
            };

            return await this.findAll(query, page, limit);
        } catch (error) {
            throw new Error(`Search by name failed: ${error.message}`);
        }
    }

    async searchWithFilters(filters = {}, page = 1, limit = 12) {
        try {
            const query = {};

            if (filters.name && filters.name.trim()) {
                query.name = { 
                    $regex: filters.name.trim(), 
                    $options: 'i' 
                };
            }

            if (filters.cuisine && filters.cuisine.trim()) {
                query.cuisine = filters.cuisine.trim();
            }

            query.name = {
                ...query.name,
                $exists: true,
                $ne: null,
                $ne: ""
            };

            return await this.findAll(query, page, limit);
        } catch (error) {
            throw new Error(`Search with filters failed: ${error.message}`);
        }
    }

    async addComment(restaurantId, commentData) {
        try {
            const commentId = new ObjectId();
            
            const result = await this.collection.updateOne(
                { _id: new ObjectId(restaurantId) },
                { 
                    $push: { 
                        comments: {
                            _id: commentId,
                            ...commentData,
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    },
                    $set: { updated_at: new Date() }
                }
            );

            if (result.modifiedCount === 0) {
                throw new Error('Failed to add comment');
            }

            return {
                _id: commentId,
                ...commentData,
                created_at: new Date(),
                updated_at: new Date()
            };
        } catch (error) {
            throw new Error(`Add comment failed: ${error.message}`);
        }
    }

    async updateComment(restaurantId, commentId, userId, updateData) {
        try {
            const result = await this.collection.updateOne(
                { 
                    _id: new ObjectId(restaurantId),
                    'comments._id': new ObjectId(commentId),
                    'comments.user_id': userId
                },
                { 
                    $set: { 
                        'comments.$.text': updateData.text,
                        'comments.$.rating': updateData.rating,
                        'comments.$.updated_at': new Date(),
                        updated_at: new Date()
                    }
                }
            );

            if (result.modifiedCount === 0) {
                const restaurant = await this.collection.findOne({
                    _id: new ObjectId(restaurantId),
                    'comments._id': new ObjectId(commentId)
                });
                
                if (!restaurant) {
                    throw new Error('Restaurant or comment not found');
                }
                throw new Error('You are not authorized to edit this comment');
            }

            return {
                success: true,
                message: 'Comment updated successfully'
            };
        } catch (error) {
            throw new Error(`Update comment failed: ${error.message}`);
        }
    }

    async deleteComment(restaurantId, commentId, userId) {
        try {
            const result = await this.collection.updateOne(
                { 
                    _id: new ObjectId(restaurantId),
                    'comments._id': new ObjectId(commentId),
                    'comments.user_id': userId
                },
                { 
                    $pull: { 
                        comments: { _id: new ObjectId(commentId) }
                    },
                    $set: { updated_at: new Date() }
                }
            );

            if (result.modifiedCount === 0) {
                const restaurant = await this.collection.findOne({
                    _id: new ObjectId(restaurantId),
                    'comments._id': new ObjectId(commentId)
                });
                
                if (!restaurant) {
                    throw new Error('Restaurant or comment not found');
                }
                
                throw new Error('You are not authorized to delete this comment');
            }

            return {
                success: true,
                message: 'Comment deleted successfully'
            };
        } catch (error) {
            throw new Error(`Delete comment failed: ${error.message}`);
        }
    }

    async getRestaurantWithComments(id, page = 1, limit = 10) {
        try {
            const restaurant = await this.findById(id, true);
            if (!restaurant) return null;

            const commentsData = restaurant.getComments(page, limit);

            return {
                restaurant: restaurant.toJSON(),
                comments: commentsData
            };
        } catch (error) {
            throw new Error(`Get restaurant with comments failed: ${error.message}`);
        }
    }
}

module.exports = RestaurantRepository;