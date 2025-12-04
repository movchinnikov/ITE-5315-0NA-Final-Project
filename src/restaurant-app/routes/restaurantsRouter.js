const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/authMiddleware');
const database = require('../config/database');
const RestaurantService = require('../services/RestaurantService')
const CommentRepository = require('../repositories/CommentRepository');

const router = express.Router();
const commentRepository = new CommentRepository();

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
        const service = await getRestaurantService();
        const { neighborhood, cuisine, name, page = 1 } = req.query;

        let result;
        
        if (neighborhood) {
            result = await service.findByNeighborhood(neighborhood, cuisine, name, parseInt(page));
        } else {
            result = await service.findAll(cuisine, name, parseInt(page));
        }

        res.json({
            success: true,
            restaurants: result.restaurants,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                hasNextPage: result.currentPage < result.totalPages
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:id', async (req, res) => {
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

        res.json({
            success: true,
            ...result
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

module.exports = router;