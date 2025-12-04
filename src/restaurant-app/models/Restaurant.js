class Restaurant {
    constructor(data) {
        this._id = data._id;
        this.name = data.name;
        this.cuisine = data.cuisine;
        this.borough = data.borough;
        this.address = data.address || {};
        this.grades = data.grades || [];
        this.images = data.images || [];
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
        return mainImg ? mainImg.thumbnail_url : '/images/restaurant-default.png';
    }

    toJSON() {
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
            images: this.images
        };
    }
}

module.exports = Restaurant;