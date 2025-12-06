const RestaurantRepository = require('../repositories/RestaurantRepository');

class RestaurantService {
    constructor(db) {
        this.restaurantRepository = new RestaurantRepository(db);
        this.cachedNeighborhoods = null;
        this.cachedCuisines = null;
    }

    async cacheNeighborhoods() {
        try {
            this.cachedNeighborhoods = await this.restaurantRepository.cacheNeighborhoods();
        } catch (error) {
            this.cachedNeighborhoods = [];
        }
    }

    async cacheCuisines() {
        try {
            this.cachedCuisines = await this.restaurantRepository.cacheCuisines();
        } catch (error) {
            this.cachedCuisines = [];
        }
    }

    getNeighborhoods() {
        return this.cachedNeighborhoods || [];
    }

    getCuisines() {
        return this.cachedCuisines || [];
    }

    async findAll(cuisine, restaurantName, page = 1, limit = 12) {
        try {
            const query = {};

            if (cuisine) {
                query.cuisine = cuisine;
            }

            if (restaurantName) {
                query.name = { $regex: restaurantName, $options: 'i' };
            }

            return await await this.restaurantRepository.findAll(query, page, limit);

        } catch (error) {
            console.error('Error finding all restaurants:', error);
            throw error;
        }
    }

    async findByNeighborhood(neighborhoodName, cuisine, restaurantName, page = 1, limit = 12) {
        try {
            const query = {};

            if (cuisine) {
                query.cuisine = cuisine;
            }

            if (restaurantName) {
                query.name = { $regex: restaurantName, $options: 'i' };
            }

            return await await this.restaurantRepository.findByNeighborhood(neighborhoodName, query, page, limit);
        } catch (error) {
            console.error('Error finding restaurants in neighborhood:', error);
            throw error;
        }
    }

    async findById(id) {
        try {
            return await this.restaurantRepository.findById(id, true);
        } catch (error) {
            throw new Error(`Find restaurant by ID failed: ${error.message}`);
        }
    }

    async getRestaurantWithComments(id, page = 1, limit = 10) {
        try {
            return await this.restaurantRepository.getRestaurantWithComments(id, page, limit);
        } catch (error) {
            throw new Error(`Get restaurant with comments failed: ${error.message}`);
        }
    }

    async addComment(restaurantId, commentData) {
        try {
            return await this.restaurantRepository.addComment(restaurantId, commentData);
        } catch (error) {
            throw new Error(`Add comment failed: ${error.message}`);
        }
    }

    async searchByName(searchTerm, page = 1, limit = 12) {
        try {
            return await this.restaurantRepository.searchByName(searchTerm, page, limit);
        } catch (error) {
            throw new Error(`Search by name failed: ${error.message}`);
        }
    }

    async searchWithFilters(filters = {}, page = 1, limit = 12) {
        try {
            return await this.restaurantRepository.searchWithFilters(filters, page, limit);
        } catch (error) {
            throw new Error(`Search with filters failed: ${error.message}`);
        }
    }
}

module.exports = RestaurantService;