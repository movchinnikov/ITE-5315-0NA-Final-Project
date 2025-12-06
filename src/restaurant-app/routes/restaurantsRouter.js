const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/authMiddleware');
const database = require('../config/database');
const RestaurantService = require('../services/RestaurantService');

const router = express.Router();

let restaurantService = null;

const getRestaurantService = async () => {
    if (!restaurantService) {
        const db = await database.getDB();
        restaurantService = new RestaurantService(db);
        await Promise.all([
            restaurantService.cacheNeighborhoods(),
            restaurantService.cacheCuisines()
        ]);
    }

    return restaurantService;
};

router.get('/', async (req, res) => {
    try {
        console.log('GET /api/restaurants - Loading restaurant data');
        
        const { neighborhood, cuisine, name, page = 1, limit = 12 } = req.query;

        let restaurantsData;
        
        const restaurantService = await getRestaurantService();

        if (neighborhood) {
            restaurantsData = await restaurantService.findByNeighborhood(
                neighborhood, 
                cuisine, 
                name, 
                parseInt(page),
                parseInt(limit)
            );
        } else {
            restaurantsData = await restaurantService.findAll(
                cuisine, 
                name, 
                parseInt(page),
                parseInt(limit)
            );
        }

        res.json({
            success: true,
            restaurants: restaurantsData.restaurants,
            pagination: {
                currentPage: restaurantsData.currentPage,
                totalPages: restaurantsData.totalPages,
                hasNextPage: restaurantsData.currentPage < restaurantsData.totalPages,
                totalCount: restaurantsData.totalCount,
                pageSize: limit
            }
        });

    } catch (error) {
        console.error('Error loading restaurants API:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading restaurants: ' + error.message
        });
    }
});

router.get('/search', async (req, res) => {
    try {
        const service = await getRestaurantService();
        const { 
            q,
            cuisine,
            neighborhood,
            page = 1
        } = req.query;

        if (q && !cuisine && !neighborhood) {
            const result = await service.searchByName(q, parseInt(page));
            
            return res.json({
                success: true,
                ...result,
                searchType: 'name'
            });
        }

        const filters = {};
        if (q) filters.name = q;
        if (cuisine) filters.cuisine = cuisine;
        if (neighborhood) filters.neighborhood = neighborhood;

        const result = await service.searchWithFilters(filters, parseInt(page));
        
        res.json({
            success: true,
            ...result,
            searchType: 'filters'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const service = await getRestaurantService();
        const { id } = req.params;
        const { page = 1 } = req.query;

        const result = await service.getRestaurantWithComments(id, parseInt(page));

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const userId = req.user ? req.user.user_id : null;

        console.log('!!!!!' + userId);

        res.json({
            success: true,
            ...result,
            userId: userId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/:id/comments', authenticateToken, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const service = await getRestaurantService();
        
        const commentData = {
            ...req.body,
            user_id: req.user.userId,
            username: req.user.username
        };

        const comment = await service.addComment(id, commentData);

        res.json({
            success: true,
            message: 'Comment added successfully',
            comment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.put('/:restaurantId/comments/:commentId', authenticateToken, requireAuth, async (req, res) => {
    try {
        const { restaurantId, commentId } = req.params;
        const { text, rating } = req.body;
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const service = await getRestaurantService();
        const result = await service.updateComment(
            restaurantId,
            commentId,
            req.user.userId,
            { text: text.trim(), rating: rating || null }
        );

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.delete('/:restaurantId/comments/:commentId', authenticateToken, requireAuth, async (req, res) => {
    try {
        const { restaurantId, commentId } = req.params;
        
        const service = await getRestaurantService();
        const result = await service.deleteComment(
            restaurantId,
            commentId,
            req.user.userId
        );

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;