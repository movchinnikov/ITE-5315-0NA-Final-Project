$(document).ready(function() {
    console.log('Restaurant app loaded');
    let currentPage = 1;
    let isLoading = false;
    let currentFilters = {};

    // Load restaurants when page is ready
    loadRestaurants();

    // Filters form submission
    $('#filters-form').on('submit', function(e) {
        e.preventDefault();
        currentPage = 1;
        
        const formData = $(this).serializeArray();
        currentFilters = {};
        
        formData.forEach(item => {
            if (item.value) {
                currentFilters[item.name] = item.value;
            }
        });
        
        console.log('Applying filters:', currentFilters);
        loadRestaurants();
    });

    // Clear filters
    $('#clear-filters').on('click', function() {
        console.log('Clearing filters');
        $('#filters-form')[0].reset();
        currentFilters = {};
        currentPage = 1;
        loadRestaurants();
    });

    // Load more restaurants
    $('#load-more').on('click', function() {
        console.log('Loading more restaurants, page:', currentPage + 1);
        currentPage++;
        loadRestaurants(false);
    });

    // Load restaurants function
    function loadRestaurants(clearExisting = true) {
        if (isLoading) {
            console.log('Already loading, skipping...');
            return;
        }
        
        isLoading = true;
        console.log('Loading restaurants, page:', currentPage, 'clear:', clearExisting);
        
        if (clearExisting) {
            $('#restaurants-container').empty();
            $('#load-more-container').hide();
            $('#loading-indicator').show();
        } else {
            $('#load-more').prop('disabled', true).text('Loading...');
        }

        const loadData = { ...currentFilters, page: currentPage };
        console.log('Request data:', loadData);
        
        $.get('/api/restaurants', loadData)
            .done(function(response) {
                console.log('API response:', response);
                
                if (response.success) {
                    if (clearExisting) {
                        $('#restaurants-container').empty();
                    }
                    
                    if (response.restaurants && response.restaurants.length > 0) {
                        console.log(`Rendering ${response.restaurants.length} restaurants`);
                        renderRestaurants(response.restaurants);
                        
                        // Show/hide load more button
                        if (response.pagination.hasNextPage) {
                            $('#load-more-container').show();
                            $('#load-more').data('page', response.pagination.currentPage);
                            console.log('Has more pages, showing load more button');
                        } else {
                            $('#load-more-container').hide();
                            console.log('No more pages, hiding load more button');
                        }
                    } else if (clearExisting) {
                        console.log('No restaurants found');
                        showNoResults();
                    }
                } else {
                    console.error('API returned error:', response.message);
                    showError(response.message);
                }
            })
            .fail(function(xhr, status, error) {
                console.error('Error loading restaurants:', error, xhr.responseText);
                showError('Failed to load restaurants: ' + error);
            })
            .always(function() {
                isLoading = false;
                $('#loading-indicator').hide();
                $('#load-more').prop('disabled', false).text('Load More Restaurants');
                console.log('Loading completed');
            });
    }

    function renderRestaurants(restaurants) {
        console.log('Rendering restaurants:', restaurants);
        
        restaurants.forEach(restaurant => {
            console.log('Processing restaurant:', restaurant.name);
            
            // Use the model methods
            const latestGrade = restaurant.getLatestGrade ? restaurant.getLatestGrade() : 
                            (restaurant.grades && restaurant.grades.length > 0 ? restaurant.grades[0].grade : 'N/A');
            
            const latestScore = restaurant.getLatestScore ? restaurant.getLatestScore() : 
                             (restaurant.grades && restaurant.grades.length > 0 ? restaurant.grades[0].score : 'N/A');
            
            console.log(`Restaurant: ${restaurant.name}, Grade: ${latestGrade}, Score: ${latestScore}`);
            
            const restaurantHtml = `
                <div class="restaurant-card">
                    <div class="card-header">
                        <h3 class="restaurant-name">${restaurant.name}</h3>
                        <div class="cuisine-badge">${restaurant.cuisine}</div>
                    </div>
                    
                    <div class="card-body">
                        <div class="restaurant-info">
                            <div class="info-item">
                                <span class="label">Location:</span>
                                <span class="value">${restaurant.borough}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Address:</span>
                                <span class="value">${restaurant.address.street}, ${restaurant.address.building}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Cuisine:</span>
                                <span class="value">${restaurant.cuisine}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Latest Grade:</span>
                                <span class="value grade-${latestGrade}">${latestGrade}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Latest Score:</span>
                                <span class="value">${latestScore}/100</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#restaurants-container').append(restaurantHtml);
        });
        
        console.log('Finished rendering all restaurants');
    }

    function showNoResults() {
        console.log('Showing no results message');
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `);
    }

    function showError(message) {
        console.log('Showing error message:', message);
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>Error loading restaurants</h3>
                <p>${message || 'Please try again later'}</p>
            </div>
        `);
    }
});