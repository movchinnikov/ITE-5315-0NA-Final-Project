const { MongoClient } = require('mongodb');

class Database {
    constructor() {
        this.uri = null;
        this.client = null;
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) return this.db;

        try {
            this.uri = process.env.MONGODB_URI;
            
            if (!this.uri) {
                throw new Error('MONGODB_URI environment variable is not set');
            }

            console.log('Connecting to MongoDB with URI:', this.uri.substring(0, 50) + '...');
            
            this.client = new MongoClient(this.uri, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: parseInt(process.env.MONGODB_CONNECTION_TIMEOUT) || 30000,
                maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
                retryWrites: true,
                w: 'majority'
            });

            await this.client.connect();
            this.db = this.client.db(process.env.MONGODB_DB_NAME || 'sample_restaurants');
            this.isConnected = true;
            console.log(`MongoDB connected to database: ${this.db.databaseName}`);
            return this.db;
        } catch (error) {
            console.error('MongoDB connection failed:', error.message);
            console.error('Please check your .env file and MongoDB connection string');
            throw error;
        }
    }

    getDB() {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            this.db = null;
            this.client = null;
            console.log('MongoDB disconnected');
        }
    }
    
    getStatus() {
        return {
            isConnected: this.isConnected,
            uriSet: !!this.uri,
            uri: this.uri ? `${this.uri.substring(0, 30)}...` : 'Not set',
            dbName: this.db?.databaseName,
            envLoaded: !!process.env.MONGODB_URI
        };
    }
}

const database = new Database();
module.exports = database;