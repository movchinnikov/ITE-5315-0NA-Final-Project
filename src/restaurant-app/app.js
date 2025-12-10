const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const database = require('./config/database');
const hbsHelpers = require('./helpers/hbsHelpers');
const authRouter = require('./routes/authRouter');
const restaurantsRouter = require('./routes/restaurantsRouter');
const RestaurantService = require('./services/RestaurantService');
const { authenticateToken, requireAuth } = require('./middleware/authMiddleware');

try {
    require('dotenv').config({ path: __dirname + '/.env' });
    console.log('DEBUG: dotenv loaded from:', __dirname + '/.env');
} catch (error) {
    console.error('DEBUG: Failed to load dotenv with path:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

async function initializeApp() {
    try {
        const db = await database.connect();
        const restaurantService = new RestaurantService(db);
        
        await Promise.all([
            restaurantService.cacheNeighborhoods(),
            restaurantService.cacheCuisines()
        ]);

        app.locals.restaurantService = restaurantService;

        const hbs = exphbs.create({
            extname: '.hbs',
            defaultLayout: 'main',
            layoutsDir: path.join(__dirname, 'views/layouts'),
            partialsDir: path.join(__dirname, 'views/partials'),
            helpers: hbsHelpers
        });

        app.engine('hbs', hbs.engine);
        app.set('view engine', 'hbs');
        app.set('views', path.join(__dirname, 'views'));

        app.use(express.static(path.join(__dirname, 'public')));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        app.use('/auth', authRouter);
        app.use('/api/restaurants', restaurantsRouter);

        app.get('/', async (req, res) => {
            try {
                const neighborhoods = restaurantService.getNeighborhoods();
                const cuisines = restaurantService.getCuisines();
                
                const filters = {
                    neighborhood: req.query.neighborhood || '',
                    cuisine: req.query.cuisine || '',
                    name: req.query.name || '',
                    page: parseInt(req.query.page) || 1
                };
                
                res.render('home', {
                    isIndex: true,
                    title: 'NYC Restaurants Explorer',
                    neighborhoods,
                    cuisines,
                    filters,
                    query: req.query
                });
            } catch (error) {
                console.error('Error rendering home:', error);
                res.status(500).render('error', { message: error.message });
            }
        });

        app.get('/restaurants/:id', authenticateToken, async (req, res) => {
            try {
                const { id } = req.params;
                const restaurant = await restaurantService.findById(id);

                if (!restaurant) {
                    return res.status(404).render('not-found');
                }

                const userId = req.user ? req.user.userId : null;

                res.render('restaurant-details', {
                    title: restaurant.name,
                    restaurant: restaurant.toJSON(),
                    userId: userId
                });
            } catch (error) {
                console.error('Error rendering restaurant details:', error);
                res.status(500).render('error', { message: error.message });
            }
        });

        app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                database: 'connected',
                neighborhoods: restaurantService.getNeighborhoods().length,
                cuisines: restaurantService.getCuisines().length
            });
        });

        app.use((req, res) => {
            res.status(404).render('error', { message: 'Page not found' });
        });

        app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).render('error', { message: 'Internal server error' });
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });

        process.on('SIGTERM', async () => {
            await database.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

initializeApp();

module.exports = app;