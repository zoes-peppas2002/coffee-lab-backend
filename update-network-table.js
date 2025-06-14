const pool = require('./db');

async function updateNetworkTable() {
  try {
    console.log('Updating network_stores table schema...');
    
    // First, check the current schema
    const [tableInfo] = await pool.query(
      "SHOW CREATE TABLE network_stores"
    );
    console.log('Current network_stores table schema:');
    console.log(tableInfo[0]['Create Table']);
    
    // Remove the omada_krousis column and foreign key
    await pool.query(`
      ALTER TABLE network_stores 
      DROP FOREIGN KEY network_stores_ibfk_3;
    `);
    
    await pool.query(`
      ALTER TABLE network_stores 
      DROP COLUMN omada_krousis;
    `);
    
    console.log('Successfully updated network_stores table schema!');
    
    // Verify the change
    const [updatedTableInfo] = await pool.query(
      "SHOW CREATE TABLE network_stores"
    );
    console.log('Updated network_stores table schema:');
    console.log(updatedTableInfo[0]['Create Table']);
    
  } catch (error) {
    console.error('Error updating network_stores table:', error);
  } finally {
    console.log('Operation completed');
    process.exit(0);
  }
}

updateNetworkTable();
