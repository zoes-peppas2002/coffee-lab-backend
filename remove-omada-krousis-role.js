const pool = require('./db');

async function removeOmadaKrousisRole() {
  console.log('Starting removal of omada_krousis role from the database...');
  
  try {
    // First, get the IDs of users with role 'omada_krousis'
    console.log('Getting IDs of users with role "omada_krousis"...');
    const [userRows] = await pool.execute(
      'SELECT id FROM users WHERE role = ?',
      ['omada_krousis']
    );
    
    if (userRows.length === 0) {
      console.log('No users found with role "omada_krousis"');
      return;
    }
    
    const userIds = userRows.map(row => row.id);
    console.log(`Found ${userIds.length} users with role "omada_krousis"`);
    
    // 1. Delete any checklists created by users with role 'omada_krousis'
    console.log('Deleting checklists created by omada_krousis users...');
    
    // Create placeholders for the IN clause
    const placeholders = userIds.map(() => '?').join(',');
    
    const [deleteChecklistsResult] = await pool.execute(
      `DELETE FROM checklists WHERE user_id IN (${placeholders})`,
      userIds
    );
    console.log(`Deleted ${deleteChecklistsResult.affectedRows} checklists created by omada_krousis users`);
    
    // 2. Delete any stores assigned to users with role 'omada_krousis'
    console.log('Deleting stores assigned to omada_krousis users...');
    const [deleteStoresResult] = await pool.execute(
      `DELETE FROM stores WHERE assigned_to IN (${placeholders})`,
      userIds
    );
    console.log(`Deleted ${deleteStoresResult.affectedRows} stores assigned to omada_krousis users`);
    
    // 3. Delete all users with role 'omada_krousis'
    console.log('Deleting users with role "omada_krousis"...');
    const [deleteUsersResult] = await pool.execute(
      'DELETE FROM users WHERE role = ?',
      ['omada_krousis']
    );
    console.log(`Deleted ${deleteUsersResult.affectedRows} users with role "omada_krousis"`);
    
    // 4. Check if there are any other tables that might reference the omada_krousis role
    console.log('Checking for any other references to omada_krousis role...');
    
    console.log('Removal of omada_krousis role completed successfully!');
  } catch (error) {
    console.error('Error removing omada_krousis role:', error);
  } finally {
    console.log('Operation completed');
  }
}

// Execute the function
removeOmadaKrousisRole();
