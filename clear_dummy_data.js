const db = require('./backend/config/db');
require('dotenv').config();

async function clearDummyData() {
  try {
    console.log('Deleting dummy test data...');
    
    // Delete all complaints
    await db.execute('DELETE FROM complaints');
    console.log('✓ All complaints deleted');
    
    // Delete all users (test data)
    await db.execute('DELETE FROM users');
    console.log('✓ All users deleted');
    
    console.log('\nDatabase cleared successfully!');
    console.log('Now only your actual submitted reports will appear.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearDummyData();
