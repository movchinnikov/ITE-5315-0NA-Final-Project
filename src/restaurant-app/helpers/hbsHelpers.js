module.exports = {
    formatDate: function(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    range: function(start, end) {
        const result = [];
        for (let i = start; i <= end; i++) {
            result.push(i);
        }
        return result;
    },

    getImageUrl: function(images, size = 'medium') {
        if (!images || images.length === 0) {
            return '/images/restaurant-default.jpg';
        }
        
        const mainImage = images.find(img => img.is_main) || images[0];
        return mainImage[size + '_url'] || mainImage.url || '/images/restaurant-default.jpg';
    },

    truncate: function(text, length = 100) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    stars: function(rating) {
        if (!rating) return '';
        const fullStars = '★'.repeat(Math.floor(rating));
        const halfStar = rating % 1 >= 0.5 ? '½' : '';
        const emptyStars = '☆'.repeat(5 - Math.ceil(rating));
        return fullStars + halfStar + emptyStars;
    },

    isSelected: function(value, selectedValue) {
        return value === selectedValue ? 'selected' : '';
    },

    equals: function(a, b) {
        return a === b;
    },

    gt: function(a, b) {
        return a > b;
    },

    lt: function(a, b) {
        return a < b;
    },

    json: function(context) {
        return JSON.stringify(context);
    },

    and: function(a, b) {
        return a && b;
    },

    or: function(a, b) {
        return a || b;
    },

    not: function(a) {
        return !a;
    },

    length: function(array) {
        return array ? array.length : 0;
    },

    concat: function(a, b) {
        return a + b;
    },

    formatPhone: function(phone) {
        if (!phone) return 'N/A';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }
        return phone;
    },

    exists: function(value) {
        return value !== null && value !== undefined && value !== '';
    },

    first: function(array) {
        return array && array.length > 0 ? array[0] : null;
    },

    last: function(array) {
        return array && array.length > 0 ? array[array.length - 1] : null;
    },

    uppercase: function(text) {
        return text ? text.toUpperCase() : '';
    },

    lowercase: function(text) {
        return text ? text.toLowerCase() : '';
    },

    replace: function(text, search, replacement) {
        return text ? text.replace(new RegExp(search, 'g'), replacement) : '';
    }
};