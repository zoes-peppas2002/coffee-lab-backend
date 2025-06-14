const pool = require('./db');

async function updateAdminPassword() {
  try {
    console.log('Updating admin user password...');
    
    // Update the password for the admin user with ID 1
    await pool.query(
      "UPDATE users SET password = 'Zoespeppas2025!' WHERE id = 1"
    );
    
    console.log('Successfully updated admin password!');
    
    // Get all admin users to verify
    const [adminUsers] = await pool.query(
      "SELECT id, name, email, password FROM users WHERE role = 'admin'"
    );
    
    console.log(`\nAdmin users after update:`);
    adminUsers.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Password: ${user.password}`);
    });
    
    console.log('\nIMPORTANT NOTE:');
    console.log('You now have two admin users with the following credentials:');
    console.log('1. Email: zp@coffeelab.gr, Password: Zoespeppas2025!');
    console.log('2. Email: d.hal@coffeelab.gr, Password: chalkias2025!');
    console.log('You can use either of these accounts to log in as an admin.');
    
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    console.log('Operation completed');
    process.exit(0);
  }
}

updateAdminPassword();
