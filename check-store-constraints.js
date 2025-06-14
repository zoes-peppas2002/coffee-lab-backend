const pool = require('./db');

async function checkAndRemoveUniqueConstraint() {
  try {
    // Χρήση του υπάρχοντος pool
    const connection = pool;
    
    console.log('Έλεγχος για περιορισμούς μοναδικότητας στον πίνακα stores...');
    
    // Έλεγχος για περιορισμούς μοναδικότητας στον πίνακα stores
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'stores'
      AND CONSTRAINT_TYPE = 'UNIQUE'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (constraints.length === 0) {
      console.log('Δεν βρέθηκαν περιορισμοί μοναδικότητας στον πίνακα stores.');
    } else {
      console.log(`Βρέθηκαν ${constraints.length} περιορισμοί μοναδικότητας:`);
      
      // Αφαίρεση των περιορισμών μοναδικότητας
      for (const constraint of constraints) {
        console.log(`- Αφαίρεση περιορισμού: ${constraint.CONSTRAINT_NAME}`);
        await connection.query(`
          ALTER TABLE stores
          DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}
        `);
      }
      
      console.log('Όλοι οι περιορισμοί μοναδικότητας αφαιρέθηκαν επιτυχώς.');
    }
    
    // Έλεγχος για unique indexes στον πίνακα stores
    const [indexes] = await connection.query(`
      SHOW INDEX FROM stores
      WHERE Non_unique = 0
      AND Key_name != 'PRIMARY'
    `);
    
    if (indexes.length === 0) {
      console.log('Δεν βρέθηκαν unique indexes στον πίνακα stores.');
    } else {
      console.log(`Βρέθηκαν ${indexes.length} unique indexes:`);
      
      // Συγκέντρωση των unique indexes ανά όνομα
      const uniqueIndexes = new Set();
      for (const index of indexes) {
        uniqueIndexes.add(index.Key_name);
      }
      
      // Αφαίρεση των unique indexes
      for (const indexName of uniqueIndexes) {
        console.log(`- Αφαίρεση unique index: ${indexName}`);
        await connection.query(`
          ALTER TABLE stores
          DROP INDEX ${indexName}
        `);
      }
      
      console.log('Όλοι οι unique indexes αφαιρέθηκαν επιτυχώς.');
    }
    
    console.log('Η διαδικασία ολοκληρώθηκε επιτυχώς.');
  } catch (error) {
    console.error('Σφάλμα:', error);
  }
}

// Εκτέλεση της συνάρτησης
checkAndRemoveUniqueConstraint();
