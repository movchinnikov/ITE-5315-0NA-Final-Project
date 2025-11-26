$(document).ready(function() {
    console.log('Restaurant app loaded');
    let currentPage = 1;
    let isLoading = false;
    let hasMoreData = true;
    let currentFilters = {};

    // Load restaurants when page is ready
    loadRestaurants();

    // Infinite scroll with optimized loading
    let scrollTimeout;
    $(window).on('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            if (shouldLoadMore()) {
                loadMoreRestaurants();
            }
        }, 100);
    });

    // Filters form submission
    $('#filters-form').on('submit', function(e) {
        e.preventDefault();
        resetAndLoadRestaurants();
    });

    // Clear filters
    $('#clear-filters').on('click', function() {
        console.log('Clearing filters');
        $('#filters-form')[0].reset();
        resetAndLoadRestaurants();
    });

    // Load more button (fallback)
    $('#load-more').on('click', function() {
        loadMoreRestaurants();
    });

    // Rating modal functionality
    $(document).on('click', '.btn-rate', function() {
        const restaurantId = $(this).data('restaurant-id');
        const restaurantName = $(this).data('restaurant-name');
        
        $('#rating-restaurant-id').val(restaurantId);
        $('#rating-modal h3').text('Rate ' + restaurantName);
        $('#rating-modal').show();
        $('body').css('overflow', 'hidden');
    });

    // Close modal
    $('.close, #cancel-rating').on('click', function() {
        closeRatingModal();
    });

    // Close modal when clicking outside
    $(window).on('click', function(e) {
        if ($(e.target).is('#rating-modal')) {
            closeRatingModal();
        }
    });

    // Update score display
    $('#rating-score').on('input', function() {
        $('#score-value').text($(this).val());
    });

    // Submit rating form
    $('#rating-form').on('submit', function(e) {
        e.preventDefault();
        submitRating();
    });

    function closeRatingModal() {
        $('#rating-modal').hide();
        $('body').css('overflow', 'auto');
        $('#rating-form')[0].reset();
        $('#score-value').text('50');
    }

    function submitRating() {
        const formData = $('#rating-form').serializeArray();
        const ratingData = {};
        
        formData.forEach(item => {
            ratingData[item.name] = item.name === 'score' ? parseInt(item.value) : item.value;
        });

        console.log('Submitting rating:', ratingData);

        // Show loading state
        $('#rating-form').hide();
        $('.modal-body').html('<div class="rating-success">Submitting rating...</div>');

        $.ajax({
            url: '/api/rate',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(ratingData),
            success: function(response) {
                if (response.success) {
                    $('.modal-body').html(`
                        <div class="rating-success">
                            Rating submitted successfully!
                            <p>Thank you for your feedback</p>
                        </div>
                    `);
                    
                    setTimeout(() => {
                        closeRatingModal();
                        // Optional: Reload user ratings for this restaurant
                        loadUserRating(ratingData.restaurant_id);
                    }, 2000);
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON;
                $('.modal-body').html(`
                    <div class="no-results">
                        <h3>Error submitting rating</h3>
                        <p>${error.message || 'Please try again'}</p>
                        <button class="btn-primary" onclick="location.reload()">Retry</button>
                    </div>
                `);
            }
        });
    }

    function loadUserRating(restaurantId) {
        // Optional: Load and display average user rating
        $.get(`/api/restaurants/${restaurantId}/user-rating`)
            .done(function(response) {
                if (response.success && response.average_rating) {
                    $(`[data-restaurant-id="${restaurantId}"] .btn-rate`)
                        .text(`Rated: ${response.average_rating}/100`)
                        .prop('disabled', true)
                        .css('opacity', '0.7');
                }
            })
            .fail(function() {
                // Silently fail - user ratings are optional
            });
    }

    function resetAndLoadRestaurants() {
        currentPage = 1;
        hasMoreData = true;
        $('#restaurants-container').empty();
        
        const formData = $('#filters-form').serializeArray();
        currentFilters = {};
        
        formData.forEach(item => {
            if (item.value) {
                currentFilters[item.name] = item.value;
            }
        });
        
        console.log('Applying filters:', currentFilters);
        loadRestaurants();
    }

    function shouldLoadMore() {
        if (isLoading || !hasMoreData) {
            return false;
        }
        
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const documentHeight = $(document).height();
        const scrollThreshold = 200;
        
        const shouldLoad = (scrollTop + windowHeight >= documentHeight - scrollThreshold);
        
        if (shouldLoad) {
            console.log('Scroll threshold reached, loading more...');
        }
        
        return shouldLoad;
    }

    function loadMoreRestaurants() {
        if (isLoading || !hasMoreData) {
            console.log('Cannot load more: isLoading=', isLoading, 'hasMoreData=', hasMoreData);
            return;
        }
        
        currentPage++;
        console.log('Loading more restaurants, page:', currentPage);
        loadRestaurants(false);
    }

    function loadRestaurants(clearExisting = true) {
        if (isLoading) {
            console.log('Already loading, skipping...');
            return;
        }
        
        isLoading = true;
        console.log('Loading restaurants, page:', currentPage, 'clear:', clearExisting);
        
        if (clearExisting) {
            $('#load-more-container').hide();
            $('#loading-indicator').show();
        } else {
            $('#restaurants-container').append('<div class="infinite-loading">Loading more restaurants...</div>');
        }

        const loadData = { ...currentFilters, page: currentPage };
        
        $.get('/api/restaurants/html', loadData)
            .done(function(response) {
                console.log('API HTML response received, hasMoreData:', response.hasMoreData);
                
                if (response.success) {
                    $('.infinite-loading').remove();
                    
                    if (response.html) {
                        if (clearExisting) {
                            $('#restaurants-container').html(response.html);
                        } else {
                            $('#restaurants-container').append(response.html);
                        }
                        
                        hasMoreData = response.hasMoreData;
                        console.log('Has more data to load:', hasMoreData);
                        
                        if (hasMoreData && $(document).height() <= $(window).height() * 1.5) {
                            $('#load-more-container').show();
                        } else {
                            $('#load-more-container').hide();
                        }
                        
                        if (hasMoreData && $(document).height() <= $(window).height()) {
                            console.log('Page is short, auto-loading next page...');
                            setTimeout(() => loadMoreRestaurants(), 500);
                        }
                    } else if (clearExisting) {
                        console.log('No restaurants found');
                        showNoResults();
                        hasMoreData = false;
                    }
                } else {
                    console.error('API returned error:', response.message);
                    showError(response.message);
                    hasMoreData = false;
                }
            })
            .fail(function(xhr, status, error) {
                console.error('Error loading restaurants:', error);
                $('.infinite-loading').remove();
                showError('Failed to load restaurants: ' + error);
                hasMoreData = false;
            })
            .always(function() {
                isLoading = false;
                $('#loading-indicator').hide();
                $('#load-more').prop('disabled', false).text('Load More Restaurants');
                console.log('Loading completed');
            });
    }

    function showNoResults() {
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `);
    }

    function showError(message) {
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>Error loading restaurants</h3>
                <p>${message || 'Please try again later'}</p>
            </div>
        `);
    }
});