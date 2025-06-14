const pool = require('./db-pg');

async function checkAdminLogin() {
  try {
    console.log('Checking admin login credentials...');
    
    // Check if the admin user exists
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      ['zp@coffeelab.gr']
    );
    
    if (result.rows.length === 0) {
      console.log('Admin user not found in the database!');
      return;
    }
    
    const user = result.rows[0];
    console.log('Found admin user:');
    console.log('ID:', user.id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Password:', user.password);
    
    // Check if the password matches
    if (user.password === 'Zoespeppas2025!') {
      console.log('Password matches!');
    } else {
      console.log('Password does not match!');
      console.log('Expected: Zoespeppas2025!');
      console.log('Actual:', user.password);
    }
    
  } catch (error) {
    console.error('Error checking admin login:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
  }
}

checkAdminLogin();
