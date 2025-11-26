const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const database = require('./config/database');
const RestaurantService = require('./services/restaurantService');
const hbsHelpers = require('./helpers/hbsHelpers'); // Добавляем эту строку

const app = express();
const PORT = 3000;

let restaurantService;

// Initialize server
async function startServer() {
  try {
    // Connect to database
    const db = await database.connect();
    
    // Initialize restaurant service with cached data
    restaurantService = new RestaurantService();
    restaurantService.setDB(db);
    
    // Pre-cache neighborhoods and cuisines on startup
    console.log('Pre-caching neighborhoods and cuisines...');
    await Promise.all([
      restaurantService.cacheNeighborhoods(),
      restaurantService.cacheCuisines()
    ]);
    
    console.log('Server started with pre-cached data');

    // Handlebars setup with helpers
    const hbs = exphbs.create({
      extname: '.hbs',
      defaultLayout: 'main',
      layoutsDir: path.join(__dirname, 'views/layouts'),
      partialsDir: path.join(__dirname, 'views/partials'),
      helpers: hbsHelpers // Добавляем helpers
    });

    app.engine('hbs', hbs.engine);
    app.set('view engine', 'hbs');
    app.set('views', path.join(__dirname, 'views'));

    // Static files
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.get('/', async (req, res) => {
      try {
        console.log('GET / - Rendering page template');
        
        const { neighborhood, cuisine, name, page = 1 } = req.query;

        // Используем предзагруженные данные для фильтров
        const neighborhoods = restaurantService.getNeighborhoods();
        const cuisines = restaurantService.getCuisines();

        // Рендерим страницу сразу, без ожидания данных ресторанов
        res.render('home', {
          title: 'NYC Restaurants',
          restaurants: [], // Пустой массив - данные подгрузим через AJAX
          neighborhoods: neighborhoods,
          cuisines: cuisines,
          filters: req.query,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false
          }
        });

      } catch (error) {
        console.error('Error rendering page:', error);
        // Простая обработка ошибки
        res.send(`
          <html>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Error</h1>
              <p>${error.message}</p>
              <a href="/">Go Home</a>
            </body>
          </html>
        `);
      }
    });

    // API endpoint для загрузки ресторанов
    app.get('/api/restaurants', async (req, res) => {
      try {
        console.log('GET /api/restaurants - Loading restaurant data');
        
        const { neighborhood, cuisine, name, page = 1 } = req.query;

        let restaurantsData;
        
        if (neighborhood) {
          restaurantsData = await restaurantService.findRestaurantsInNeighborhood(
            neighborhood, cuisine, name, parseInt(page)
          );
        } else {
          restaurantsData = await restaurantService.findAllRestaurants(
            cuisine, name, parseInt(page)
          );
        }

        res.json({
          success: true,
          restaurants: restaurantsData.restaurants,
          pagination: {
            currentPage: restaurantsData.currentPage,
            totalPages: restaurantsData.totalPages,
            hasNextPage: restaurantsData.currentPage < restaurantsData.totalPages
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

    app.get('/test', (req, res) => {
      res.json({ status: 'ok', message: 'Server is working!' });
    });

    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        database: 'connected',
        neighborhoods: restaurantService.getNeighborhoods().length,
        cuisines: restaurantService.getCuisines().length
      });
    });

    // API endpoint to render restaurant cards HTML
    app.get('/api/restaurants/html', async (req, res) => {
        try {
            console.log('GET /api/restaurants/html - Rendering restaurant cards');
            
            const { neighborhood, cuisine, name, page = 1 } = req.query;

            let restaurantsData;
            
            if (neighborhood) {
                restaurantsData = await restaurantService.findRestaurantsInNeighborhood(
                    neighborhood, cuisine, name, parseInt(page), 13
                );
            } else {
                restaurantsData = await restaurantService.findAllRestaurants(
                    cuisine, name, parseInt(page), 13
                );
            }

            // Подготавливаем данные для шаблона
            const preparedRestaurants = restaurantsData.restaurants.map(restaurant => 
                hbsHelpers.prepareRestaurant(restaurant)
            );

            // Проверяем есть ли еще данные
            const hasMoreData = preparedRestaurants.length > 12;
            const restaurantsToRender = hasMoreData ? preparedRestaurants.slice(0, 12) : preparedRestaurants;

            // Рендерим HTML
            const html = await hbs.render(
                path.join(__dirname, 'views/partials/restaurant-cards.hbs'),
                { restaurants: restaurantsToRender }
            );

            res.json({
                success: true,
                html: html,
                hasMoreData: hasMoreData,
                currentPage: restaurantsData.currentPage,
                totalPages: restaurantsData.totalPages
            });

        } catch (error) {
            console.error('Error rendering restaurant cards:', error);
            res.status(500).json({
                success: false,
                message: 'Error rendering restaurants: ' + error.message
            });
        }
    });

    // Simple 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Simple error handler
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;