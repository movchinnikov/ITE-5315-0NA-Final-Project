class UserRating {
    constructor(data) {
        this._id = data._id;
        this.restaurant_id = data.restaurant_id;
        this.user_id = data.user_id;
        this.username = data.username;
        this.rating = data.rating;
        this.comment = data.comment || '';
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
    }

    validate() {
        const errors = [];
        
        if (!this.restaurant_id) errors.push('Restaurant ID is required');
        if (!this.user_id) errors.push('User ID is required');
        if (!this.username) errors.push('Username is required');
        if (!this.rating || this.rating < 1 || this.rating > 5) errors.push('Rating must be between 1 and 5');
        
        return errors;
    }

    toJSON() {
        return {
            _id: this._id,
            restaurant_id: this.restaurant_id,
            user_id: this.user_id,
            username: this.username,
            rating: this.rating,
            comment: this.comment,
            created_at: this.created_at
        };
    }
}

module.exports = UserRating;