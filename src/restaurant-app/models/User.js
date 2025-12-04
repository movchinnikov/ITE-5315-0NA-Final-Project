const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this._id = data._id;
        this.username = data.username;
        this.email = data.email || '';
        this.password = data.password;
        this.avatar = data.avatar || '/images/user-default.png';
        this.role = data.role || 'user';
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
        this.favorites = data.favorites || [];
    }

    async validate() {
        const errors = [];
        
        if (!this.username || this.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters');
        }
        
        if (this.username && this.username.length > 50) {
            errors.push('Username must be less than 50 characters');
        }
        
        if (this.email && !this.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.push('Invalid email format');
        }
        
        if (!this.password || this.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        
        return errors;
    }

    async hashPassword() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 12);
        }
    }

    async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    }

    addFavorite(restaurantId) {
        if (!this.favorites.includes(restaurantId)) {
            this.favorites.push(restaurantId);
        }
    }

    removeFavorite(restaurantId) {
        this.favorites = this.favorites.filter(id => id !== restaurantId);
    }

    toJSON() {
        return {
            _id: this._id,
            username: this.username,
            email: this.email,
            avatar: this.avatar,
            role: this.role,
            created_at: this.created_at,
            favorites: this.favorites
        };
    }
}

module.exports = User;