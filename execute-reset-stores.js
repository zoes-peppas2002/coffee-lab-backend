const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const pool = require('./db');

async function executeResetStores() {
  try {
    console.log('Εκκίνηση διαδικασίας επαναφοράς καταστημάτων...');
    
    // Ανάγνωση του SQL script
    const sqlFilePath = path.join(__dirname, 'reset-stores.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Διαχωρισμός των SQL εντολών
    const sqlCommands = sqlScript
      .split(';')
      .filter(command => command.trim() !== '')
      .map(command => command.trim() + ';');
    
    // Εκτέλεση κάθε SQL εντολής
    for (const command of sqlCommands) {
      // Παραλείπουμε τα σχόλια
      if (command.trim().startsWith('--')) continue;
      
      try {
        console.log('Εκτέλεση SQL εντολής:', command.substring(0, 50) + '...');
        await pool.query(command);
        console.log('Η εντολή εκτελέστηκε επιτυχώς.');
      } catch (err) {
        console.error('Σφάλμα κατά την εκτέλεση της εντολής:', command);
        console.error('Λεπτομέρειες σφάλματος:', err.message);
        
        // Συνεχίζουμε με την επόμενη εντολή
        console.log('Συνέχεια με την επόμενη εντολή...');
      }
    }
    
    console.log('Η διαδικασία επαναφοράς καταστημάτων ολοκληρώθηκε επιτυχώς!');
    console.log('Μπορείτε τώρα να προσθέσετε νέα καταστήματα στη λίστα δικτύου.');
    
    // Κλείσιμο της σύνδεσης με τη βάση δεδομένων
    process.exit(0);
  } catch (error) {
    console.error('Σφάλμα κατά τη διαδικασία επαναφοράς:', error);
    process.exit(1);
  }
}

// Εκτέλεση της συνάρτησης
executeResetStores();
