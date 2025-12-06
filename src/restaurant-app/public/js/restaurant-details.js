class RestaurantDetails {
    constructor() {
        this.restaurantId = null;
        this.userAuthenticated = false;
        this.comments = [];
        this.currentUserId = null;
        this.commentToDelete = null;

        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadRestaurantData();

        if (typeof authService !== 'undefined' && typeof authService.isAuthenticated === 'function') {
            this.userAuthenticated = authService.isAuthenticated();
            this.currentUserId = authService.user.userId;
        } else {
            this.userAuthenticated = false;
        }
    }

    setupEventListeners() {
        $(document).on('click', '.btn-back', () => this.goBackToList());

        // Star rating for new comment
        $(document).on('click', '.star-btn', function () {
            const rating = $(this).data('rating');
            $(this).parent().find('.star-btn').removeClass('active');
            $(this).prevAll('.star-btn').addBack().addClass('active');
            $('#comment-rating').val(rating);
        });

        // Star rating for editing
        $(document).on('click', '.star-btn-edit', function () {
            const rating = $(this).data('rating');
            const container = $(this).closest('.stars-input');
            
            container.find('.fas.fa-star').removeClass('active');
            container.find('.star-btn-edit').each(function(index) {
                if (index < rating) {
                    $(this).find('.fas.fa-star').addClass('active');
                }
            });
            
            container.siblings('.edit-comment-rating').val(rating);
        });

        // Comment form submission
        $(document).on('submit', '#comment-form', (e) => this.submitComment(e));

        // Edit comment button
        $(document).on('click', '.btn-edit-comment', (e) => this.handleEditComment(e));
        
        // Delete comment button
        $(document).on('click', '.btn-delete-comment', (e) => this.handleDeleteComment(e));
        
        // Save edited comment
        $(document).on('click', '.btn-save-edit', (e) => this.handleSaveEdit(e));
        
        // Cancel edit
        $(document).on('click', '.btn-cancel-edit', (e) => this.handleCancelEdit(e));

        // Modal actions
        $('#confirm-delete').on('click', () => this.confirmDeleteComment());
        $('#cancel-delete, .close-modal').on('click', () => this.closeDeleteModal());

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

    isCommentOwner(commentUserId) {
        return this.currentUserId && commentUserId === this.currentUserId;
    }

    renderCommentHtml(comment) {
        const isOwner = this.isCommentOwner(comment.user_id);
        
        return `
            <div class="comment-card" data-comment-id="${comment._id}" data-user-id="${comment.user_id}">
                <div class="comment-header">
                    <span class="comment-author">
                        <i class="fas fa-user"></i> ${comment.username}
                    </span>
                    
                    ${comment.rating ? `
                        <div class="comment-rating">
                            ${'★'.repeat(comment.rating)}${'☆'.repeat(5 - comment.rating)}
                        </div>` : ''}

                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="btn-icon btn-edit-comment" title="Edit comment">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete-comment" title="Delete comment">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>` : ''}
                </div>

                <div class="comment-body">
                    <p class="comment-text">${this.escapeHtml(comment.text)}</p>
                </div>

                <div class="comment-footer">
                    <span class="comment-date">
                        ${new Date(comment.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                </div>
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

    handleEditComment(e) {
        const $commentCard = $(e.target).closest('.comment-card');
        $commentCard.find('.comment-text').hide();
        $commentCard.find('.comment-edit-form').show();
        $commentCard.find('.comment-actions').hide();
    }

    handleCancelEdit(e) {
        const $commentCard = $(e.target).closest('.comment-card');
        $commentCard.find('.comment-edit-form').hide();
        $commentCard.find('.comment-text').show();
        
        if (this.isCommentOwner($commentCard.data('user-id'))) {
            $commentCard.find('.comment-actions').show();
        }
    }

    async handleSaveEdit(e) {
        const $commentCard = $(e.target).closest('.comment-card');
        const commentId = $commentCard.data('comment-id');
        
        const rating = parseInt($commentCard.find('.edit-comment-rating').val());
        const text = $commentCard.find('.edit-comment-text').val().trim();
        
        if (!rating || rating < 1 || rating > 5) {
            this.showMessage('Please select a rating', 'error');
            return;
        }
        
        if (text.length < 10) {
            this.showMessage('Comment must be at least 10 characters', 'error');
            return;
        }
        
        const saveBtn = $commentCard.find('.btn-save-edit');
        saveBtn.prop('disabled', true).text('Saving...');
        
        try {
            const response = await $.ajax({
                url: `/api/restaurants/${this.restaurantId}/comments/${commentId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({ text, rating })
            });
            
            if (response.success) {
                this.showMessage('Comment updated successfully!', 'success');
                // Reload comments or update in place
                this.handleCancelEdit(e);
                // Optionally refresh the comment data
                this.refreshComment(commentId);
            }
        } catch (error) {
            const msg = error.responseJSON?.message || 'Failed to update comment';
            this.showMessage(msg, 'error');
            this.handleCancelEdit(e);
        } finally {
            saveBtn.prop('disabled', false).text('Save');
        }
    }

    handleDeleteComment(e) {
        const $commentCard = $(e.target).closest('.comment-card');
        this.commentToDelete = {
            id: $commentCard.data('comment-id'),
            element: $commentCard
        };
        
        $('#delete-comment-modal').show();
    }

    async confirmDeleteComment() {
        if (!this.commentToDelete) return;
        
        const deleteBtn = $('#confirm-delete');
        deleteBtn.prop('disabled', true).text('Deleting...');
        
        try {
            const response = await $.ajax({
                url: `/api/restaurants/${this.restaurantId}/comments/${this.commentToDelete.id}`,
                method: 'DELETE'
            });
            
            if (response.success) {
                this.showMessage('Comment deleted successfully!', 'success');
                this.commentToDelete.element.remove();
                this.closeDeleteModal();
                
                // If no comments left, show "No comments yet"
                if ($('#comments-container .comment-card').length === 0) {
                    $('#comments-container').html(`
                        <div class="no-results">
                            <p>No comments yet. Be the first to comment!</p>
                        </div>
                    `);
                }
            }
        } catch (error) {
            const msg = error.responseJSON?.message || 'Failed to delete comment';
            this.showMessage(msg, 'error');
        } finally {
            deleteBtn.prop('disabled', false).text('Delete');
            this.commentToDelete = null;
        }
    }

    closeDeleteModal() {
        $('#delete-comment-modal').hide();
        this.commentToDelete = null;
    }

    async refreshComment(commentId) {
        try {
            const response = await $.ajax({
                url: `/api/restaurants/${this.restaurantId}/comments/${commentId}`
            });
            
            if (response.success && response.comment) {
                const $commentCard = $(`.comment-card[data-comment-id="${commentId}"]`);
                const isOwner = this.isCommentOwner(response.comment.user_id);
                
                // Update comment text
                $commentCard.find('.comment-text').text(response.comment.text);
                
                // Update rating
                if (response.comment.rating) {
                    $commentCard.find('.comment-rating').html(
                        '★'.repeat(response.comment.rating) + '☆'.repeat(5 - response.comment.rating)
                    );
                }
                
                // Update edit form values
                if (isOwner) {
                    $commentCard.find('.edit-comment-rating').val(response.comment.rating || 0);
                    $commentCard.find('.edit-comment-text').val(response.comment.text);
                    
                    // Update stars in edit form
                    $commentCard.find('.star-btn-edit .fas.fa-star').each(function(index) {
                        $(this).toggleClass('active', (index + 1) <= (response.comment.rating || 0));
                    });
                }
                
                // Update edited date if exists
                if (response.comment.updated_at) {
                    const editedHtml = `
                        <div class="comment-footer">
                            <span class="comment-edited">
                                Edited ${new Date(response.comment.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                    `;
                    $commentCard.find('.comment-footer').remove();
                    $commentCard.append(editedHtml);
                }
            }
        } catch (error) {
            console.error('Failed to refresh comment:', error);
        }
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