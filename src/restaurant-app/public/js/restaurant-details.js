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
        this.loadComments();

        // FIX: корректное определение аутентификации
        if (typeof authService !== 'undefined' && typeof authService.isAuthenticated === 'function') {
            this.userAuthenticated = authService.isAuthenticated();
        } else {
            this.userAuthenticated = false;
        }
    }

    setupEventListeners() {
        $(document).on('click', '.btn-back', () => this.goBackToList());

        $(document).on('click', '.star-btn', function () {
            const rating = $(this).data('rating');
            $(this).parent().find('.star-btn').removeClass('active');
            $(this).prevAll('.star-btn').addBack().addClass('active');
            $('#comment-rating').val(rating);
        });

        // IMPORTANT: Delegate event (form re-renders)
        $(document).on('submit', '#comment-form', (e) => this.submitComment(e));

        this.storeReferrerUrl();
    }

    storeReferrerUrl() {
        if (!window.location.pathname.includes('/restaurants/')) {
            sessionStorage.setItem('restaurantListUrl', window.location.href);
        }
    }

    goBackToList() {
        const referrer = document.referrer;

        if (referrer && referrer.includes(window.location.origin)) {
            window.location.href = referrer;
        } else {
            window.location.href = '/';
        }
    }

    async loadRestaurantData() {
        const match = window.location.pathname.match(/\/restaurants\/([^/]+)/);

        if (match) {
            this.restaurantId = match[1];
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
        container.empty();

        if (this.comments.length === 0) {
            container.append(`
                <div class="no-results">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `);
            return;
        }

        for (const comment of this.comments) {
            container.append(this.renderCommentHtml(comment));
        }
    }

    renderCommentHtml(comment) {
        return `
            <div class="comment-card" data-comment-id="${comment._id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <img src="${comment.avatar || '/images/user-default.png'}"
                             alt="${comment.username}"
                             class="author-avatar">
                        <div class="author-info">
                            <h4>${comment.username}</h4>
                            <span class="comment-date">
                                ${new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    ${comment.rating ? `
                        <div class="comment-rating">
                            ${'★'.repeat(comment.rating)}${'☆'.repeat(5 - comment.rating)}
                        </div>` : ''}
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `;
    }

    appendSingleComment(comment) {
        const container = $('#comments-container');

        // Remove "No comments yet"
        container.find('.no-results').remove();

        // Append comment HTML
        container.append(this.renderCommentHtml(comment));
    }

    async submitComment(e) {
        e.preventDefault();

        if (!this.userAuthenticated) {
            this.showMessage('Please login to post comments', 'error');
            $('#login-btn').click();
            return;
        }

        const text = $('#comment-text').val().trim();
        const rating = parseInt($('#comment-rating').val());

        if (text.length < 10) {
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
                data: JSON.stringify({ text, rating })
            });

            if (response.success) {
                this.showMessage('Comment added successfully!', 'success');

                this.appendSingleComment(response.comment);

                // Reset form
                $('#comment-text').val('');
                $('#comment-rating').val(0);
                $('.star-btn').removeClass('active');
            }
        } catch (error) {
            const msg = error.responseJSON?.message || 'Failed to add comment';
            this.showMessage(msg, 'error');
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
}

$(document).ready(function () {
    if (window.location.pathname.includes('/restaurants/')) {
        window.restaurantDetails = new RestaurantDetails();
    }
});