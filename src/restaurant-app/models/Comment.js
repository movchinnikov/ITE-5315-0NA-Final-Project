class Comment {
    constructor(data) {
        this._id = data._id;
        this.restaurant_id = data.restaurant_id;
        this.user_id = data.user_id;
        this.username = data.username;
        this.text = data.text;
        this.rating = data.rating || null;
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
        this.is_edited = data.is_edited || false;
    }

    validate() {
        const errors = [];
        
        if (!this.restaurant_id) errors.push('Restaurant ID is required');
        if (!this.user_id) errors.push('User ID is required');
        if (!this.username || this.username.trim().length < 2) errors.push('Username must be at least 2 characters');
        if (!this.text || this.text.trim().length < 10) errors.push('Comment must be at least 10 characters');
        if (this.text && this.text.length > 1000) errors.push('Comment must be less than 1000 characters');
        if (this.rating && (this.rating < 1 || this.rating > 5)) errors.push('Rating must be between 1 and 5');
        
        return errors;
    }

    toJSON() {
        return {
            _id: this._id,
            restaurant_id: this.restaurant_id,
            user_id: this.user_id,
            username: this.username,
            text: this.text,
            rating: this.rating,
            created_at: this.created_at,
            updated_at: this.updated_at,
            is_edited: this.is_edited
        };
    }
}

module.exports = Comment;