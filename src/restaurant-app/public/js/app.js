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
        const scrollThreshold = 200; // pixels from bottom
        
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
            // Show loading indicator at bottom for infinite scroll
            $('#restaurants-container').append('<div class="infinite-loading">Loading more restaurants...</div>');
        }

        const loadData = { ...currentFilters, page: currentPage };
        
        $.get('/api/restaurants/html', loadData)
            .done(function(response) {
                console.log('API HTML response received, hasMoreData:', response.hasMoreData);
                
                if (response.success) {
                    // Remove loading indicator
                    $('.infinite-loading').remove();
                    
                    if (response.html) {
                        if (clearExisting) {
                            $('#restaurants-container').html(response.html);
                        } else {
                            $('#restaurants-container').append(response.html);
                        }
                        
                        hasMoreData = response.hasMoreData;
                        console.log('Has more data to load:', hasMoreData);
                        
                        // Show load more button only if we have more data and page is short
                        if (hasMoreData && $(document).height() <= $(window).height() * 1.5) {
                            $('#load-more-container').show();
                        } else {
                            $('#load-more-container').hide();
                        }
                        
                        // If we still have space and more data, load next page automatically
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