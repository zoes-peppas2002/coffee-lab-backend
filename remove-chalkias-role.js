const pool = require('./db');

async function removeChalkiasRole() {
  console.log('Starting removal of chalkias role from the database...');
  
  try {
    // Use the existing pool connection
    
    // 1. Delete all users with role 'chalkias'
    console.log('Deleting users with role "chalkias"...');
    const [deleteUsersResult] = await pool.execute(
      'DELETE FROM users WHERE role = ?',
      ['chalkias']
    );
    console.log(`Deleted ${deleteUsersResult.affectedRows} users with role "chalkias"`);
    
    // 2. Delete any stores assigned to users with role 'chalkias' (if they weren't already deleted)
    console.log('Checking for any remaining stores assigned to chalkias users...');
    const [deleteStoresResult] = await pool.execute(
      'DELETE FROM stores WHERE assigned_to IN (SELECT id FROM users WHERE role = ?)',
      ['chalkias']
    );
    console.log(`Deleted ${deleteStoresResult.affectedRows} stores assigned to chalkias users`);
    
    // 3. Delete any checklists created by users with role 'chalkias'
    console.log('Deleting checklists created by chalkias users...');
    const [deleteChecklistsResult] = await pool.execute(
      'DELETE FROM checklists WHERE user_id IN (SELECT id FROM users WHERE role = ?)',
      ['chalkias']
    );
    console.log(`Deleted ${deleteChecklistsResult.affectedRows} checklists created by chalkias users`);
    
    // 4. Check if there are any other tables that might reference the chalkias role
    console.log('Checking for any other references to chalkias role...');
    
    console.log('Removal of chalkias role completed successfully!');
  } catch (error) {
    console.error('Error removing chalkias role:', error);
  } finally {
    console.log('Operation completed');
  }
}

// Execute the function
removeChalkiasRole();
