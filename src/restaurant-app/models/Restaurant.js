class Restaurant {
    constructor(data) {
        this._id = data._id;
        this.name = data.name || '';
        this.cuisine = data.cuisine;
        this.borough = data.borough;
        this.address = data.address || {};
        this.grades = data.grades || [];
        this.images = data.images || [];
        this.comments = data.comments || [];
        this.description = data.description || '';
        this.website = data.website || '';
        this.phone = data.phone || '';
        this.opening_hours = data.opening_hours || {};
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
    }

    hasValidName() {
        return this.name && 
               this.name.trim() !== '' && 
               this.name !== null && 
               this.name !== undefined;
    }

    getLatestGrade() {
        if (!this.grades || this.grades.length === 0) return 'N/A';
        const sorted = [...this.grades].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        return sorted[0].grade || 'N/A';
    }

    getLatestScore() {
        if (!this.grades || this.grades.length === 0) return 0;
        const sorted = [...this.grades].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        return sorted[0].score || 0;
    }

    getMainImage() {
        return this.images.find(img => img.is_main) || this.images[0] || null;
    }

    getThumbnail() {
        const mainImg = this.getMainImage();
        return mainImg ? mainImg.url : '/images/restaurant-default.png';
    }

    getComments(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedComments = this.comments.slice(start, end);
        
        return {
            comments: paginatedComments,
            total: this.comments.length,
            totalPages: Math.ceil(this.comments.length / limit),
            currentPage: page
        };
    }

    getAverageRating() {
        if (this.comments.length === 0) return "N/A";
        const total = this.comments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
        const average = Math.round((total / this.comments.length) * 10) / 10;
        return `${average.toFixed(1)}/5 ★`;
    }

    toJSONForList() {
        if (!this.hasValidName()) {
            return null;
        }
        
        return {
            _id: this._id,
            name: this.name,
            cuisine: this.cuisine,
            borough: this.borough,
            address: this.address,
            latestGrade: this.getLatestGrade(),
            latestScore: this.getLatestScore(),
            thumbnail: this.getThumbnail(),
            description: this.description,
            website: this.website,
            phone: this.phone
        };
    }

    toJSON() {
        if (!this.hasValidName()) {
            return null;
        }
        
        return {
            _id: this._id,
            name: this.name,
            cuisine: this.cuisine,
            borough: this.borough,
            address: this.address,
            latestGrade: this.getLatestGrade(),
            latestScore: this.getLatestScore(),
            thumbnail: this.getThumbnail(),
            description: this.description,
            website: this.website,
            phone: this.phone,
            images: this.images,
            grades: this.grades,
            comments: this.comments,
            averageRating: this.getAverageRating(),
            totalComments: this.comments.length
        };
    }
}

module.exports = Restaurant;