const Restaurant = require('../models/Restaurant');

class RestaurantService {
  constructor() {
    this.db = null;
    this.restaurantsCollection = null;
    this.neighborhoodsCollection = null;
    this.cachedNeighborhoods = null;
    this.cachedCuisines = null;
  }

  setDB(db) {
    this.db = db;
    this.restaurantsCollection = db.collection('restaurants');
    this.neighborhoodsCollection = db.collection('neighborhoods');
  }

  async cacheNeighborhoods() {
    try {
      const neighborhoods = await this.neighborhoodsCollection.find({}).toArray();
      this.cachedNeighborhoods = neighborhoods.map(n => n.name).filter(name => name).sort();
      console.log('Cached neighborhoods:', this.cachedNeighborhoods.length);
    } catch (error) {
      console.error('Error caching neighborhoods:', error);
      this.cachedNeighborhoods = [];
    }
  }

  async cacheCuisines() {
    try {
      const cuisines = await this.restaurantsCollection.distinct('cuisine');
      this.cachedCuisines = cuisines.filter(c => c).sort();
      console.log('Cached cuisines:', this.cachedCuisines.length);
    } catch (error) {
      console.error('Error caching cuisines:', error);
      this.cachedCuisines = [];
    }
  }

  getNeighborhoods() {
    return this.cachedNeighborhoods || [];
  }

  getCuisines() {
    return this.cachedCuisines || [];
  }

  async findAllRestaurants(cuisine, restaurantName, page = 1, limit = 12) {
    try {
      console.time('AllRestaurantsSearch');
      
      const query = {};

      if (cuisine) {
        query.cuisine = cuisine;
      }

      if (restaurantName) {
        query.name = { $regex: restaurantName, $options: 'i' };
      }

      const skip = (page - 1) * limit;

      const [restaurants, totalCount] = await Promise.all([
        this.restaurantsCollection
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.restaurantsCollection.countDocuments(query)
      ]);

      console.timeEnd('AllRestaurantsSearch');
      console.log(`Found ${restaurants.length} restaurants total`);

      // ВАЖНО: Преобразуем в модель Restaurant
      const restaurantModels = restaurants.map(r => new Restaurant(r));

      return {
        restaurants: restaurantModels, // Используем модели
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      };

    } catch (error) {
      console.error('Error finding all restaurants:', error);
      throw error;
    }
  }

  async findRestaurantsInNeighborhood(neighborhoodName, cuisine, restaurantName, page = 1, limit = 12) {
    try {
      console.time('NeighborhoodSearch');
      
      const neighborhood = await this.neighborhoodsCollection.findOne({
        name: neighborhoodName
      });

      if (!neighborhood) {
        console.log('Neighborhood not found:', neighborhoodName);
        return { restaurants: [], totalCount: 0, totalPages: 0, currentPage: page };
      }

      const query = {
        'address.coord': {
          $geoWithin: {
            $geometry: neighborhood.geometry
          }
        }
      };

      if (cuisine) {
        query.cuisine = cuisine;
      }

      if (restaurantName) {
        query.name = { $regex: restaurantName, $options: 'i' };
      }

      const skip = (page - 1) * limit;

      const [restaurants, totalCount] = await Promise.all([
        this.restaurantsCollection
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.restaurantsCollection.countDocuments(query)
      ]);

      console.timeEnd('NeighborhoodSearch');
      console.log(`Found ${restaurants.length} restaurants in neighborhood ${neighborhoodName}`);

      // ВАЖНО: Преобразуем в модель Restaurant
      const restaurantModels = restaurants.map(r => new Restaurant(r));

      return {
        restaurants: restaurantModels, // Используем модели
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      };

    } catch (error) {
      console.error('Error finding restaurants in neighborhood:', error);
      throw error;
    }
  }
}

module.exports = RestaurantService;