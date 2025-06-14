const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function createNetworkTable() {
  try {
    console.log('Δημιουργία πίνακα network_stores...');
    
    // Διάβασμα του SQL script
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create-network-table.sql'), 'utf8');
    
    // Διαχωρισμός των εντολών SQL
    const sqlCommands = sqlScript.split(';').filter(command => command.trim() !== '');
    
    // Εκτέλεση κάθε εντολής SQL
    for (const command of sqlCommands) {
      await pool.query(command);
      console.log('Εκτελέστηκε επιτυχώς η εντολή SQL:', command.trim().substring(0, 50) + '...');
    }
    
    console.log('Ο πίνακας network_stores δημιουργήθηκε επιτυχώς!');
  } catch (error) {
    console.error('Σφάλμα κατά τη δημιουργία του πίνακα network_stores:', error);
  }
}

// Εκτέλεση της συνάρτησης
createNetworkTable();
