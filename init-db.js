const pool = require('./db');
const fs = require('fs');
const path = require('path');

/**
 * Initialize the database by creating necessary tables
 */
async function initDb() {
  try {
    console.log('Initializing database...');
    
    // Read SQL scripts
    const networkTableSql = fs.readFileSync(path.join(__dirname, 'create-network-table.sql'), 'utf8');
    
    // Split SQL commands
    const networkCommands = networkTableSql.split(';').filter(cmd => cmd.trim() !== '');
    
    // Execute each command
    for (const command of networkCommands) {
      await pool.query(command);
      console.log('Executed SQL command successfully');
    }
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Export the function for use in server.js
module.exports = initDb;
