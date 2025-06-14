const mysql = require('mysql2/promise');

async function checkUrls() {
  const pool = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Zoespeppas2025!",
    database: "coffee_lab_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Connecting to database...');
    
    // Get all checklists
    const [rows] = await pool.query('SELECT id, pdf_url FROM checklists');
    console.log(`Found ${rows.length} checklists`);
    
    // Print each URL
    rows.forEach(row => {
      console.log(`ID: ${row.id}, URL: ${row.pdf_url}`);
    });
    
  } catch (error) {
    console.error('Error checking URLs:', error);
  } finally {
    // Close the connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the function
checkUrls();
