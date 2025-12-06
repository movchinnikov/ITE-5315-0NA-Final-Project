class RestaurantApp {
    constructor() {
        this.isLoading = false;
        this.hasMoreData = true;
        this.currentFilters = {};
        this.currentRestaurantId = null;
        this.commentsPage = 1;
        this.currentPage = 1;
        this.shouldScrollToPage = false;
        this.targetPageElement = null;
        
        $(document).ready(() => {
            this.initialize();
        });
    }

    initialize() {
        this.setupEventListeners();
        this.initializeStarRatings();
        this.parseUrlFilters();
        this.loadRestaurants().then(() => {
            this.waitForPageRender().then(() => {
                this.scrollToPageIfNeeded();
            });
        });
        this.updateCommentsSection();
    }

    waitForPageRender() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    resolve();
                });
            });
        });
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

        // Infinite scroll
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
        
        const filters = ['neighborhood', 'cuisine', 'name', 'page'];
        
        filters.forEach(filter => {
            const value = urlParams.get(filter);
            if (value) {
                this.currentFilters[filter] = value;
            }
        });
        
        this.currentPage = parseInt(this.currentFilters.page) || 1;
        
        if (this.currentPage !== 1) {
            this.shouldScrollToPage = true;
            this.targetPageElement = 'page-' + this.currentPage;
        }
        
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

    updateUrlFromFilters(page = 1) {
        const formData = $('#filters-form').serializeArray();
        const newFilters = {};
        
        formData.forEach(item => {
            if (item.value) {
                newFilters[item.name] = item.value;
            }
        });
        
        if (page > 1) {
            newFilters.page = page;
        } else {
            delete newFilters.page;
        }
        
        this.currentFilters = newFilters;
        this.currentPage = page;
        
        const url = new URL(window.location);
        const params = new URLSearchParams();
        
        Object.keys(this.currentFilters).forEach(key => {
            params.set(key, this.currentFilters[key]);
        });
        
        const newUrl = `${url.pathname}?${params.toString()}`;
        
        window.history.pushState(
            { filters: this.currentFilters, page: this.currentPage },
            document.title,
            newUrl
        );
        
        this.resetAndLoadRestaurants();
    }

    clearUrlFilters() {
        const url = new URL(window.location);
        const newUrl = url.pathname;
        
        window.history.pushState(
            { filters: {}, page: 1 },
            document.title,
            newUrl
        );
        
        this.currentFilters = {};
        this.currentPage = 1;
        this.resetAndLoadRestaurants();
    }

    applyFiltersFromUrl() {
        this.updateFormFromFilters();
        this.resetAndLoadRestaurants();
    }

    resetAndLoadRestaurants() {
        this.hasMoreData = true;
        this.currentPage = parseInt(this.currentFilters.page) || 1;
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
        
        this.currentPage++;
        this.updateUrlWithCurrentPage();
        
        this.loadRestaurants(false);
    }

    updateUrlWithCurrentPage() {
        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        
        if (this.currentPage > 1) {
            params.set('page', this.currentPage);
        } else {
            params.delete('page');
        }
        
        const newUrl = `${url.pathname}?${params.toString()}`;
        
        window.history.replaceState(
            { filters: this.currentFilters, page: this.currentPage },
            document.title,
            newUrl
        );
    }

    async loadRestaurants(clearExisting = true) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        const startPage = clearExisting ? 1 : this.currentPage;
        const totalPagesToLoad = this.shouldScrollToPage ? this.currentPage : 1;
        
        if (clearExisting) {
            $('#load-more-container').hide();
            $('#loading-indicator').show();
        } else {
            $('#restaurants-container').append('<div class="loading-indicator">Loading more restaurants...</div>');
        }

        const loadData = { ...this.currentFilters };
        if (!clearExisting) {
            loadData.page = startPage;
        }
        
        try {
            if (this.shouldScrollToPage && clearExisting) {
                await this.loadMultiplePages(startPage, totalPagesToLoad);
                this.shouldScrollToPage = false;
            } else {
                const response = await $.get('/api/restaurants', loadData);
                await this.processRestaurantsResponse(response, clearExisting);
            }
            
        } catch (error) {
            console.error('Error loading restaurants:', error);
            this.showError('Failed to load restaurants. Please try again.');
            this.hasMoreData = false;
        } finally {
            this.isLoading = false;
            $('#loading-indicator').hide();
        }
    }
    
    async loadMultiplePages(startPage, totalPages) {
        let allRestaurants = [];
        let hasMore = true;
        
        for (let page = startPage; page <= totalPages && hasMore; page++) {
            try {
                const loadData = { ...this.currentFilters, page: page };
                const response = await $.get('/api/restaurants', loadData);
                
                if (response.success && response.restaurants && response.restaurants.length > 0) {
                    allRestaurants = allRestaurants.concat(response.restaurants);
                    hasMore = response.pagination.hasNextPage;
                    
                    const html = this.renderRestaurants(response.restaurants, page);
                    $('#restaurants-container').append(html);
                    
                    this.currentPage = page;
                    this.hasMoreData = hasMore;
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error(`Error loading page ${page}:`, error);
                break;
            }
        }
        
        if (this.hasMoreData) {
            $('#load-more-container').show();
        }
    }
    
    async processRestaurantsResponse(response, clearExisting) {
        if (response.success) {
            $('.loading-indicator').remove();
            
            if (response.restaurants && response.restaurants.length > 0) {
                const html = this.renderRestaurants(response.restaurants, this.currentPage);
                
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
    }

    renderRestaurants(restaurants, pageNumber = 1) {
        const pageAnchor = pageNumber > 1 ? ` data-page-id="page-${pageNumber}"` : '';
        
        return restaurants.map((restaurant, index) => `
            <div class="restaurant-card" data-restaurant-id="${restaurant._id}"${pageNumber > 1 && index === 0 ? pageAnchor : ''}>
                ${restaurant.thumbnail ? `<img src="${restaurant.thumbnail}" alt="${restaurant.name}" class="card-image">` : ''}
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
                            <span class="value grade-${restaurant.latestGrade ? restaurant.latestGrade.replace('/', '-') : 'N/A'}">${restaurant.latestGrade || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Latest Score:</span>
                            <span class="value">${restaurant.latestScore || 'N/A'}/100</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    scrollToPageIfNeeded() {
        if (this.currentPage !== 1) {
            setTimeout(() => {
                this.scrollToPage('page-' + this.currentPage);
            }, 500);
        }
    }
    
    scrollToPage(pageId) {
        const targetElement = $('[data-page-id="' + pageId + '"]');
        if (targetElement.length) {
            $('html, body').animate({
                scrollTop: targetElement.offset().top
            }, 500);
        } else {
            const pageNumber = parseInt(pageId.replace('#page-', ''));
            if (pageNumber > this.currentPage) {
                this.shouldScrollToPage = true;
                this.targetPageElement = pageId;
                this.currentFilters.page = pageNumber;
                this.currentPage = 1;
                this.resetAndLoadRestaurants();
            }
        }
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
                <p>Try adjusting your search criteria</p>
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
    
    generatePageLink(pageNumber) {
        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        
        if (pageNumber > 1) {
            params.set('page', pageNumber);
        } else {
            params.delete('page');
        }
        
        return `${url.pathname}?${params.toString()}#page-${pageNumber}`;
    }
}

$(document).ready(function() {
    window.restaurantApp = new RestaurantApp();
});