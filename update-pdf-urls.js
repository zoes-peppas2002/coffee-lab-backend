const mysql = require('mysql2/promise');

async function updatePdfUrls() {
  // Create database connection
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
    console.log(`Found ${rows.length} checklists to update`);
    
    // Update each checklist with the new URL format
    for (const row of rows) {
      const oldUrl = row.pdf_url;
      
      // Skip if already updated
      if (oldUrl.startsWith('/static/')) {
        console.log(`Skipping already updated URL: ${oldUrl}`);
        continue;
      }
      
      // Extract filename from old URL
      const filename = oldUrl.split('/').pop();
      
      // Create new URL with /static/ prefix
      const newUrl = `/static/pdfs/${filename}`;
      
      // Update the database
      await pool.query('UPDATE checklists SET pdf_url = ? WHERE id = ?', [newUrl, row.id]);
      console.log(`Updated checklist ${row.id}: ${oldUrl} -> ${newUrl}`);
    }
    
    console.log('Database update completed successfully');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    // Close the connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the update function
updatePdfUrls();
