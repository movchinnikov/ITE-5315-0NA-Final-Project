class RestaurantDetails {
    constructor() {
        this.restaurantId = null;
        this.userAuthenticated = false;
        this.comments = [];
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadRestaurantData();
    }

    setupEventListeners() {
        // Back button
        $(document).on('click', '.btn-back', () => this.goBackToList());
        
        // Rate restaurant button
        $(document).on('click', '.btn-rate', (e) => {
            const restaurantId = $(e.target).data('restaurant-id');
            const restaurantName = $(e.target).data('restaurant-name');
            this.showRatingModal(restaurantId, restaurantName);
        });
        
        // Star rating in comment form
        $(document).on('click', '.star-btn', function() {
            const rating = $(this).data('rating');
            $(this).parent().find('.star-btn').removeClass('active');
            $(this).prevAll('.star-btn').addBack().addClass('active');
            $(this).closest('.rating-input').find('input[name="rating"]').val(rating);
        });
        
        // Comment form submission
        $('#comment-form').on('submit', (e) => this.submitComment(e));
        
        // Login prompt buttons
        $('#prompt-login-btn').on('click', () => $('#login-btn').click());
        $('#prompt-signup-btn').on('click', () => $('#signup-btn').click());
        
        // Store current URL when not on restaurant details page
        this.storeReferrerUrl();
    }

    storeReferrerUrl() {
        if (!window.location.pathname.includes('/restaurants/')) {
            sessionStorage.setItem('restaurantListUrl', window.location.href);
        }
    }

    goBackToList() {
        const backUrl = sessionStorage.getItem('restaurantListUrl') || '/';
        window.location.href = backUrl;
    }

    async loadRestaurantData() {
        // Extract restaurant ID from URL
        const path = window.location.pathname;
        const match = path.match(/\/restaurants\/([^/]+)/);
        
        if (match) {
            this.restaurantId = match[1];
            
            // Check if user is authenticated
            if (typeof authService !== 'undefined') {
                this.userAuthenticated = authService.isAuthenticated();
                
                // Load comments if user is authenticated
                if (this.userAuthenticated) {
                    await this.loadComments();
                }
            }
        }
    }

    async loadComments() {
        if (!this.restaurantId) return;
        
        try {
            const response = await $.get(`/api/restaurants/${this.restaurantId}`);
            
            if (response.success && response.comments) {
                this.comments = response.comments.comments || [];
                this.renderComments();
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
            $('#comments-container').html(`
                <div class="no-results">
                    <p>Failed to load comments. Please try again later.</p>
                </div>
            `);
        }
    }

    renderComments() {
        const container = $('#comments-container');
        
        if (this.comments.length === 0) {
            container.html(`
                <div class="no-results">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `);
            return;
        }
        
        const html = this.comments.map(comment => `
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
            </div>
        `).join('');
        
        container.html(html);
    }

    async submitComment(e) {
        e.preventDefault();
        
        if (!this.userAuthenticated) {
            this.showMessage('Please login to post comments', 'error');
            $('#login-btn').click();
            return;
        }
        
        const text = $('#comment-text').val().trim();
        const rating = $('#comment-rating').val();
        
        if (!text || text.length < 10) {
            this.showMessage('Comment must be at least 10 characters', 'error');
            return;
        }
        
        if (rating < 1) {
            this.showMessage('Please select a rating', 'error');
            return;
        }
        
        const submitBtn = $('#submit-comment');
        submitBtn.prop('disabled', true).text('Submitting...');
        
        try {
            const response = await $.ajax({
                url: `/api/restaurants/${this.restaurantId}/comments`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    text: text,
                    rating: parseInt(rating)
                })
            });
            
            if (response.success) {
                $('#comment-text').val('');
                $('.star-btn').removeClass('active');
                $('#comment-rating').val(0);
                this.showMessage('Comment added successfully!', 'success');
                await this.loadComments();
            }
        } catch (error) {
            const errorMsg = error.responseJSON?.message || 'Failed to add comment';
            this.showMessage(errorMsg, 'error');
        } finally {
            submitBtn.prop('disabled', false).text('Submit Comment');
        }
    }

    showMessage(message, type) {
        const $message = $(`<div class="auth-message ${type}">${message}</div>`);
        $('#comments-container').before($message);
        setTimeout(() => $message.fadeOut(), 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateAuthStatus() {
        if (typeof authService !== 'undefined') {
            this.userAuthenticated = authService.isAuthenticated();
            
            // Reload comments if user just logged in
            if (this.userAuthenticated) {
                this.loadComments();
            }
        }
    }
}

// Initialize restaurant details when document is ready
$(document).ready(function() {
    // Only initialize on restaurant details pages
    if (window.location.pathname.includes('/restaurants/')) {
        window.restaurantDetails = new RestaurantDetails();
    }
});

// Listen for auth status changes
$(document).on('authStatusChanged', function() {
    if (window.restaurantDetails) {
        window.restaurantDetails.updateAuthStatus();
    }
});