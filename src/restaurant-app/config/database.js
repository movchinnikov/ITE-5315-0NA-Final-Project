const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.uri = "mongodb+srv://root:root@cluster0.spl3gna.mongodb.net/sample_restaurants?retryWrites=true&w=majority";
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('Connecting to MongoDB...');
      
      this.client = new MongoClient(this.uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000,
      });

      await this.client.connect();
      this.db = this.client.db('sample_restaurants');
      this.isConnected = true;
      
      console.log('MongoDB connected successfully');
      return this.db;
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      throw error;
    }
  }

  getDB() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

const database = new Database();
module.exports = database;