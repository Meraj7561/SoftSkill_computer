const mysql = require('mysql2/promise');

// Reuse the pool across serverless invocations (important on Vercel, where
// modules can stay warm between requests but a fresh pool per request would
// quickly exhaust your database's connection limit).
let pool = global.__softskillPool;

if (!pool) {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        // Most managed MySQL providers (PlanetScale, Aiven, etc.) require SSL.
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    global.__softskillPool = pool;
}

module.exports = pool;
