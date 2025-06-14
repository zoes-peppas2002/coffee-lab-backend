const pool = require('./db');

async function updateUsersTable() {
  try {
    console.log('Updating users table schema...');
    
    // Modify the role enum to remove 'chalkias' and 'omada_krousis'
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'area_manager', 'coffee_specialist') DEFAULT NULL
    `);
    
    console.log('Successfully updated users table schema!');
    
    // Verify the change
    const [tableInfo] = await pool.query(
      "SHOW CREATE TABLE users"
    );
    console.log('Updated users table schema:');
    console.log(tableInfo[0]['Create Table']);
    
  } catch (error) {
    console.error('Error updating users table:', error);
  } finally {
    console.log('Operation completed');
    process.exit(0);
  }
}

updateUsersTable();
