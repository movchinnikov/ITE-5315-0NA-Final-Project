module.exports = {
    // Prepare restaurant data for template
    prepareRestaurant: function(restaurant) {
        const latestGrade = restaurant.getLatestGrade ? restaurant.getLatestGrade() : 
                          (restaurant.grades && restaurant.grades.length > 0 ? restaurant.grades[0].grade : 'N/A');
        
        const latestScore = restaurant.getLatestScore ? restaurant.getLatestScore() : 
                           (restaurant.grades && restaurant.grades.length > 0 ? restaurant.grades[0].score : 'N/A');
        
        return {
            ...restaurant,
            latestGrade: latestGrade,
            latestScore: latestScore
        };
    },
    
    // JSON stringify for debugging
    json: function(context) {
        return JSON.stringify(context);
    }
};