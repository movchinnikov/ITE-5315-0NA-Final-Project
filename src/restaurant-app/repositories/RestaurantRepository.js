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

    async findById(id) {
        try {
            let restaurant = null;

            try {
                restaurant = await this.collection.findOne({ _id: new ObjectId(id) });
            } catch (e) {
                return null;
            }

            if (!restaurant) return null;

            return new Restaurant(restaurant);
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

            // Always exclude restaurants with empty names
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

    async getSimilarRestaurants(restaurantId, limit = 4) {
        try {
            const restaurant = await this.findById(restaurantId);
            if (!restaurant) return [];

            const similar = await this.collection
                .find({
                    cuisine: restaurant.cuisine,
                    borough: restaurant.borough,
                    _id: { $ne: new ObjectId(restaurantId) }
                })
                .limit(limit)
                .toArray();

            return similar.map(r => new Restaurant(r).toJSON()).filter(r => r !== null);
        } catch (error) {
            throw new Error(`Get similar restaurants failed: ${error.message}`);
        }
    }

    async update(id, updateData) {
        try {
            updateData.updated_at = new Date();
            const result = await this.collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Update restaurant failed: ${error.message}`);
        }
    }

    async addImage(restaurantId, imageData) {
        try {
            const result = await this.collection.updateOne(
                { _id: new ObjectId(restaurantId) },
                { $push: { images: imageData } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            throw new Error(`Add image failed: ${error.message}`);
        }
    }
}

module.exports = RestaurantRepository;