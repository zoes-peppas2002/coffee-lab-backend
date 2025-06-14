const pool = require('./db');

async function checkAdminUsers() {
  try {
    console.log('Checking admin users...');
    
    // Get all admin users
    const [adminUsers] = await pool.query(
      "SELECT id, name, email, password FROM users WHERE role = 'admin'"
    );
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Password: ${user.password}`);
    });
    
    // Explain the issue with multiple admin users
    console.log('\nIMPORTANT NOTE:');
    console.log('Each user must have a unique email address due to a database constraint.');
    console.log('If you want to create multiple admin users, each must have a different email address.');
    console.log('You cannot have two admin users with the same email address.');
    
  } catch (error) {
    console.error('Error checking admin users:', error);
  } finally {
    console.log('Operation completed');
    process.exit(0);
  }
}

checkAdminUsers();
