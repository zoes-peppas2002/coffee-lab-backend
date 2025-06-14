const pool = require('./db');

async function checkUsersTable() {
  try {
    // Get table schema
    console.log('Checking users table schema...');
    const [tableInfo] = await pool.query(
      "SHOW CREATE TABLE users"
    );
    console.log('Users table schema:');
    console.log(tableInfo[0]['Create Table']);
    
    // Get all users
    console.log('\nListing all users:');
    const [users] = await pool.query(
      "SELECT id, name, email, role FROM users"
    );
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Check if there's a unique constraint on email
    console.log('\nChecking for unique constraints:');
    const [indexes] = await pool.query(
      "SHOW INDEXES FROM users WHERE Column_name = 'email'"
    );
    console.log('Indexes on email field:');
    console.log(indexes);
    
  } catch (error) {
    console.error('Error checking users table:', error);
  } finally {
    console.log('Operation completed');
    process.exit(0);
  }
}

checkUsersTable();
