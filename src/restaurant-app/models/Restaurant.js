class Restaurant {
  constructor(data) {
    this._id = data._id;
    this.name = data.name;
    this.cuisine = data.cuisine;
    this.borough = data.borough;
    this.address = data.address;
    this.grades = data.grades || [];
  }

  getLatestGrade() {
    if (!this.grades || this.grades.length === 0) return 'N/A';
    try {
      const sorted = [...this.grades].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      return sorted[0].grade || 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  getLatestScore() {
    if (!this.grades || this.grades.length === 0) return 0;
    try {
      const sorted = [...this.grades].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      return sorted[0].score || 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = Restaurant;