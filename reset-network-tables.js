const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function resetNetworkTables() {
  try {
    console.log('Εκκίνηση διαδικασίας επαναφοράς πινάκων...');
    
    // 1. Διαγραφή του πίνακα network_stores αν υπάρχει
    console.log('Διαγραφή του πίνακα network_stores...');
    await pool.query('DROP TABLE IF EXISTS network_stores');
    console.log('Ο πίνακας network_stores διαγράφηκε επιτυχώς.');
    
    // 2. Καθαρισμός του πίνακα stores από παλιές αντιστοιχίσεις
    console.log('Καθαρισμός του πίνακα stores...');
    await pool.query('DELETE FROM stores');
    console.log('Ο πίνακας stores καθαρίστηκε επιτυχώς.');
    
    // 3. Δημιουργία του πίνακα network_stores από το SQL script
    console.log('Δημιουργία του πίνακα network_stores...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-network-table.sql'), 'utf8');
    const sqlCommands = sqlScript.split(';').filter(command => command.trim() !== '');
    
    for (const command of sqlCommands) {
      await pool.query(command);
      console.log('Εκτελέστηκε επιτυχώς η εντολή SQL:', command.trim().substring(0, 50) + '...');
    }
    
    console.log('Η διαδικασία επαναφοράς ολοκληρώθηκε επιτυχώς!');
    console.log('Μπορείτε τώρα να προσθέσετε νέα καταστήματα στη λίστα δικτύου.');
    
    // Κλείσιμο της σύνδεσης με τη βάση δεδομένων
    process.exit(0);
  } catch (error) {
    console.error('Σφάλμα κατά τη διαδικασία επαναφοράς:', error);
    process.exit(1);
  }
}

// Εκτέλεση της συνάρτησης
resetNetworkTables();
