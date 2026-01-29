/**
 * Advanced API Gateway - Production-Grade JavaScript/Node.js
 * Demonstrates: Express.js, Async/Await, Middleware, ES6+, Error Handling
 * 
 * Modern JavaScript Features:
 * - Async/await for asynchronous operations
 * - ES6+ features (destructuring, spread, arrow functions)
 * - Middleware pattern
 * - Promise-based error handling 
 * - Higher-order functions
 * - Template literals
 */

const express = require('express');
const cors = require('cors');

// Configuration using destructuring and default values
const config = {
    port: process.env.PORT || 3000,
    apiVersion: 'v2',
    maxRequestSize: '10mb',
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};

// Simulated database with async operations
class DatabaseService {
    constructor() {
        this.data = new Map();
        console.log('[Database] Initialized in-memory store');
    }

    async query(collection, filter = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));

        const records = this.data.get(collection) || [];

        // Filter using modern array methods
        return records.filter(record => {
            return Object.entries(filter).every(([key, value]) =>
                record[key] === value
            );
        });
    }

    async insert(collection, record) {
        await new Promise(resolve => setTimeout(resolve, 10));

        const records = this.data.get(collection) || [];
        const newRecord = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...record
        };

        records.push(newRecord);
        this.data.set(collection, records);

        return newRecord;
    }

    async update(collection, id, updates) {
        await new Promise(resolve => setTimeout(resolve, 10));

        const records = this.data.get(collection) || [];
        const index = records.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error(`Record ${id} not found in ${collection}`);
        }

        records[index] = {
            ...records[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        return records[index];
    }
}

// Analytics service using higher-order functions
class AnalyticsService {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
    }

    // Memoization pattern for caching
    async getMetric(metricName) {
        const cacheKey = `metric:${metricName}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) {
                return cached.value;
            }
        }

        const value = await this.calculateMetric(metricName);
        this.cache.set(cacheKey, {
            value,
            timestamp: Date.now()
        });

        return value;
    }

    async calculateMetric(metricName) {
        const records = await this.db.query('events');

        // Use reduce for aggregation
        const metrics = {
            totalEvents: records.length,
            avgAttendance: records.reduce((sum, r) =>
                sum + (r.attendance || 0), 0) / records.length || 0,
            uniqueUsers: new Set(records.map(r => r.userId)).size
        };

        return metrics[metricName] || 0;
    }

    // Async generator for pagination (modern ES feature)
    async *paginateResults(collection, pageSize = 10) {
        const records = await this.db.query(collection);

        for (let i = 0; i < records.length; i += pageSize) {
            yield records.slice(i, i + pageSize);
        }
    }
}

// Middleware: Request logger
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

// Middleware: Authentication (simplified for demo)
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication token required'
        });
    }

    try {
        // Simulate async token verification
        await new Promise(resolve => setTimeout(resolve, 5));
        req.user = { id: 1, role: 'admin' }; // Mock user
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware: Error handler
const errorHandler = (err, req, res, next) => {
    console.error('[Error]', err);

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        error: {
            message,
            status,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

// Async wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Create Express app
const createApp = () => {
    const app = express();
    const db = new DatabaseService();
    const analytics = new AnalyticsService(db);

    // Middleware setup
    app.use(cors());
    app.use(express.json({ limit: config.maxRequestSize }));
    app.use(requestLogger);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            version: config.apiVersion,
            timestamp: new Date().toISOString()
        });
    });

    // Analytics endpoint with async/await
    app.get('/api/analytics/:metric', authenticate, asyncHandler(async (req, res) => {
        const { metric } = req.params;

        const value = await analytics.getMetric(metric);

        res.json({
            metric,
            value,
            timestamp: new Date().toISOString(),
            user: req.user.id
        });
    }));

    // Events CRUD with modern async patterns
    app.post('/api/events', authenticate, asyncHandler(async (req, res) => {
        const { name, attendance, userId } = req.body;

        // Validation using modern JavaScript
        if (!name || attendance === undefined) {
            return res.status(400).json({
                error: 'Validation failed',
                required: ['name', 'attendance']
            });
        }

        const event = await db.insert('events', { name, attendance, userId });

        res.status(201).json({
            success: true,
            data: event
        });
    }));

    app.get('/api/events', asyncHandler(async (req, res) => {
        const { userId, page = 1, limit = 10 } = req.query;

        // Build filter using shorthand property syntax
        const filter = userId ? { userId: parseInt(userId) } : {};

        const events = await db.query('events', filter);

        // Pagination logic
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        res.json({
            data: events.slice(startIndex, endIndex),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: events.length,
                pages: Math.ceil(events.length / limit)
            }
        });
    }));

    // Demonstrate async generator usage
    app.get('/api/events/stream', asyncHandler(async (req, res) => {
        res.setHeader('Content-Type', 'application/x-ndjson');

        for await (const page of analytics.paginateResults('events', 5)) {
            res.write(JSON.stringify(page) + '\n');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.end();
    }));

    // Batch operations using Promise.all
    app.post('/api/events/batch', authenticate, asyncHandler(async (req, res) => {
        const { events } = req.body;

        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'events must be an array' });
        }

        // Process all events in parallel
        const results = await Promise.all(
            events.map(event => db.insert('events', event))
        );

        res.status(201).json({
            success: true,
            count: results.length,
            data: results
        });
    }));

    // Error handling middleware (must be last)
    app.use(errorHandler);

    return app;
};

// Start server (if run directly)
if (require.main === module) {
    const app = createApp();

    app.listen(config.port, () => {
        console.log(`
╔═══════════════════════════════════════════╗
║  Advanced API Gateway - Node.js/Express   ║
║  Version: ${config.apiVersion}                           ║
║  Port: ${config.port}                               ║
╚═══════════════════════════════════════════╝

🚀 Server is running
📡 Endpoints:
   GET  /health
   GET  /api/analytics/:metric
   POST /api/events
   GET  /api/events
   GET  /api/events/stream
   POST /api/events/batch
        `);
    });
}

// Export for testing
module.exports = { createApp, config };
