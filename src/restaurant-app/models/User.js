const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this._id = data._id;
        this.username = data.username;
        this.password = data.password;
        this.created_at = data.created_at || new Date();
    }

    async validate() {
        const errors = [];

        if (!this.username || this.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!this.password || this.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        if (this.username && this.username.length > 50) {
            errors.push('Username must be less than 50 characters');
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

    toJSON() {
        return {
            username: this.username,
            created_at: this.created_at
        };
    }
}

module.exports = User;