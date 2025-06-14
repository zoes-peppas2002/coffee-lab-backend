const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Initialize the database by creating necessary tables
 */
async function initDb() {
  try {
    console.log('Initializing database...');
    
    // Επιλογή του κατάλληλου pool ανάλογα με το περιβάλλον
    let pool;
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
      // Χρήση PostgreSQL στο Render
      pool = require('./db-pg');
      console.log('Using PostgreSQL for initialization');
    } else {
      // Χρήση MySQL τοπικά
      pool = require('./db');
      console.log('Using MySQL for initialization');
    }
    
    // Read SQL scripts
    const networkTableSql = fs.readFileSync(path.join(__dirname, 'create-network-table.sql'), 'utf8');
    
    // Split SQL commands
    const networkCommands = networkTableSql.split(';').filter(cmd => cmd.trim() !== '');
    
    // Execute each command
    for (const command of networkCommands) {
      if (command.trim()) {
        // Προσαρμογή του SQL για PostgreSQL αν είμαστε σε περιβάλλον παραγωγής
        let sqlCommand = command;
        if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
          // Αντικατάσταση MySQL-specific syntax με PostgreSQL syntax
          sqlCommand = sqlCommand
            .replace(/AUTO_INCREMENT/g, 'SERIAL')
            .replace(/`/g, '"')
            .replace(/INT\s+NOT\s+NULL\s+AUTO_INCREMENT/gi, 'SERIAL')
            .replace(/DATETIME/gi, 'TIMESTAMP')
            .replace(/TINYINT\(1\)/gi, 'BOOLEAN');
        }
        
        await pool.query(sqlCommand);
        console.log('Executed SQL command successfully');
      }
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
