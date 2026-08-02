const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_complaint_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Log DB connection errors clearly without crashing the server
pool.getConnection((err, conn) => {
  if (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Check your Aiven database connection and environment variables.');
  } else {
    console.log('[DB] Connected to smart_complaint_db successfully.');
    conn.release();
  }
});

module.exports = pool.promise();
