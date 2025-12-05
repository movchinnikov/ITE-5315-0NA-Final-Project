class RestaurantApp {
    constructor() {
        this.isLoading = false;
        this.hasMoreData = true;
        this.currentFilters = {};
        this.currentRestaurantId = null;
        this.commentsPage = 1;
        
        $(document).ready(() => {
            this.initialize();
        });
    }

    initialize() {
        this.setupEventListeners();
        this.initializeStarRatings();
        this.parseUrlFilters();
        this.loadRestaurants();
        this.updateCommentsSection();
    }

    initializeStarRatings() {
        $(document).on('click', '.star-btn', function() {
            const rating = $(this).data('rating');
            $(this).parent().find('.star-btn').removeClass('active');
            $(this).prevAll('.star-btn').addBack().addClass('active');
            $(this).closest('.rating-input').find('input[name="rating"]').val(rating);
        });
    }

    setupEventListeners() {
        $('#filters-form').on('submit', (e) => {
            e.preventDefault();
            this.updateUrlFromFilters();
        });

        $('#clear-filters').on('click', () => {
            $('#filters-form')[0].reset();
            this.clearUrlFilters();
        });

        $('#load-more').on('click', () => this.loadMoreRestaurants());

        let scrollTimeout;
        $(window).on('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (this.shouldLoadMore()) {
                    this.loadMoreRestaurants();
                }
            }, 100);
        });

        $(window).on('popstate', (e) => {
            if (e.originalEvent.state && e.originalEvent.state.filters) {
                this.currentFilters = e.originalEvent.state.filters;
                this.applyFiltersFromUrl();
            } else {
                this.parseUrlFilters();
            }
        });
    }

    parseUrlFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentFilters = {};
        
        const filters = ['neighborhood', 'cuisine', 'name'];
        
        filters.forEach(filter => {
            const value = urlParams.get(filter);
            if (value) {
                this.currentFilters[filter] = value;
            }
        });
        
        this.updateFormFromFilters();
    }

    updateFormFromFilters() {
        if (this.currentFilters.neighborhood) {
            $('#neighborhood').val(this.currentFilters.neighborhood);
        }
        
        if (this.currentFilters.cuisine) {
            $('#cuisine').val(this.currentFilters.cuisine);
        }
        
        if (this.currentFilters.name) {
            $('#name').val(this.currentFilters.name);
        }
    }

    updateUrlFromFilters() {
        const formData = $('#filters-form').serializeArray();
        const newFilters = {};
        
        formData.forEach(item => {
            if (item.value) {
                newFilters[item.name] = item.value;
            }
        });
        
        this.currentFilters = newFilters;
        
        const url = new URL(window.location);
        const params = new URLSearchParams();
        
        Object.keys(this.currentFilters).forEach(key => {
            params.set(key, this.currentFilters[key]);
        });
        
        const newUrl = `${url.pathname}?${params.toString()}`;
        
        window.history.pushState(
            { filters: this.currentFilters },
            document.title,
            newUrl
        );
        
        this.resetAndLoadRestaurants();
    }

    clearUrlFilters() {
        const url = new URL(window.location);
        const newUrl = url.pathname;
        
        window.history.pushState(
            { filters: {} },
            document.title,
            newUrl
        );
        
        this.currentFilters = {};
        this.resetAndLoadRestaurants();
    }

    applyFiltersFromUrl() {
        this.updateFormFromFilters();
        this.resetAndLoadRestaurants();
    }

    resetAndLoadRestaurants() {
        this.hasMoreData = true;
        $('#restaurants-container').empty();
        this.loadRestaurants();
    }

    shouldLoadMore() {
        if (this.isLoading || !this.hasMoreData) return false;
        
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const documentHeight = $(document).height();
        const scrollThreshold = 200;
        
        return (scrollTop + windowHeight >= documentHeight - scrollThreshold);
    }

    loadMoreRestaurants() {
        if (this.isLoading || !this.hasMoreData) return;
        
        this.updateUrlWithCurrentPage();
        
        this.loadRestaurants(false);
    }

    updateUrlWithCurrentPage() {
        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        
        const newUrl = `${url.pathname}?${params.toString()}`;
        
        window.history.replaceState(
            { filters: this.currentFilters },
            document.title,
            newUrl
        );
    }

    async loadRestaurants(clearExisting = true) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        if (clearExisting) {
            $('#load-more-container').hide();
            $('#loading-indicator').show();
        } else {
            $('#restaurants-container').append('<div class="loading-indicator">Loading more restaurants...</div>');
        }

        const loadData = { ...this.currentFilters };
        delete loadData.page;
        
        try {
            const response = await $.get('/api/restaurants', loadData);
            
            if (response.success) {
                $('.loading-indicator').remove();
                
                if (response.restaurants && response.restaurants.length > 0) {
                    const html = this.renderRestaurants(response.restaurants);
                    
                    if (clearExisting) {
                        $('#restaurants-container').html(html);
                    } else {
                        $('#restaurants-container').append(html);
                    }
                    
                    this.hasMoreData = response.pagination.hasNextPage;
                    
                    if (this.hasMoreData) {
                        $('#load-more-container').show();
                    }
                    
                    if (this.hasMoreData && $(document).height() <= $(window).height()) {
                        setTimeout(() => this.loadMoreRestaurants(), 500);
                    }
                } else if (clearExisting) {
                    this.showNoResults();
                    this.hasMoreData = false;
                }
            } else {
                this.showError(response.message);
                this.hasMoreData = false;
            }
        } catch (error) {
            console.error('Error loading restaurants:', error);
            this.showError('Failed to load restaurants. Please try again.');
            this.hasMoreData = false;
        } finally {
            this.isLoading = false;
            $('#loading-indicator').hide();
            $('#load-more').prop('disabled', false).text('Load More Restaurants');
        }
    }

    renderRestaurants(restaurants) {
        return restaurants.map(restaurant => `
            <div class="restaurant-card" data-restaurant-id="${restaurant._id}">
                <img src="${restaurant.thumbnail}" alt="${restaurant.name}" class="card-image">
                <div class="card-content">
                    <div class="card-header">
                        <a href="/restaurants/${restaurant._id}" class="restaurant-name">${restaurant.name}</a>
                        <div class="cuisine-badge">${restaurant.cuisine}</div>
                    </div>
                    <div class="restaurant-info">
                        <div class="info-item">
                            <span class="label">Location:</span>
                            <span class="value">${restaurant.borough}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Latest Grade:</span>
                            <span class="value grade-${restaurant.latestGrade.replace('/', '-')}">${restaurant.latestGrade}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Latest Score:</span>
                            <span class="value">${restaurant.latestScore}/100</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCommentsSection() {
        const path = window.location.pathname;
        const match = path.match(/\/restaurants\/([^/]+)/);
        
        if (match) {
            this.currentRestaurantId = match[1];
            this.loadComments();
        }
    }

    async loadComments() {
        if (!this.currentRestaurantId) return;
        
        try {
            const response = await $.get(`/api/restaurants/${this.currentRestaurantId}?page=${this.commentsPage}`);
            
            if (response.success && response.comments) {
                this.renderComments(response.comments);
                
                if (response.comments.totalPages > this.commentsPage) {
                    $('#load-more-comments').show();
                } else {
                    $('#load-more-comments').hide();
                }
            }
        } catch (error) {
            console.log('Failed to load comments');
        }
    }

    renderComments(commentsData) {
        const container = $('#comments-container');
        const comments = commentsData.comments || [];
        
        if (comments.length === 0) {
            container.html('<div class="no-results"><p>No comments yet. Be the first to comment!</p></div>');
            return;
        }
        
        const html = comments.map(comment => `
            <div class="comment-card" data-comment-id="${comment._id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <img src="${comment.avatar || '/images/user-default.png'}" alt="${comment.username}" class="author-avatar">
                        <div class="author-info">
                            <h4>${comment.username}</h4>
                            <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ${comment.rating ? `<div class="comment-rating">${'★'.repeat(comment.rating)}${'☆'.repeat(5-comment.rating)}</div>` : ''}
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                <div class="comment-actions">
                    ${comment.can_edit ? '<button class="edit-btn">Edit</button>' : ''}
                    ${comment.can_delete ? '<button class="delete-btn">Delete</button>' : ''}
                </div>
            </div>
        `).join('');
        
        container.html(html);
    }

    showNoResults() {
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>No restaurants found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `);
    }

    showError(message) {
        $('#restaurants-container').html(`
            <div class="no-results">
                <h3>Error loading restaurants</h3>
                <p>${message || 'Please try again later'}</p>
            </div>
        `);
    }

    showAuthRequiredMessage() {
        this.showMessage('Please login to perform this action', 'error');
        setTimeout(() => $('#login-btn').click(), 1000);
    }

    showMessage(message, type) {
        const $message = $('<div class="auth-message ' + type + '">' + message + '</div>');
        $('#messages-container').html($message);
        setTimeout(() => $message.fadeOut(), 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

$(document).ready(function() {
    window.restaurantApp = new RestaurantApp();
});