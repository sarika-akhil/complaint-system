const db = require('./backend/config/db');
require('dotenv').config();

async function checkDB() {
  try {
    console.log('Checking admin_users table...');
    const [users] = await db.query('SELECT * FROM admin_users');
    console.log('Admin Users:', users);
    
    console.log('\nChecking departments table...');
    const [depts] = await db.query('SELECT * FROM departments');
    console.log('Departments:', depts);
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkDB();
