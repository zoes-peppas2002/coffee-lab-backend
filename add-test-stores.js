const pool = require('./db');

async function addTestStores() {
  try {
    console.log('Προσθήκη δοκιμαστικών καταστημάτων...');
    
    // Πρώτα παίρνουμε τους χρήστες από τη βάση δεδομένων
    const [users] = await pool.query(`
      SELECT id, name, role FROM users
      WHERE role IN ('area_manager', 'coffee_specialist', 'omada_krousis')
      ORDER BY role, name
    `);
    
    // Διαχωρισμός χρηστών ανά ρόλο
    const areaManagers = users.filter(user => user.role === 'area_manager');
    const coffeeSpecialists = users.filter(user => user.role === 'coffee_specialist');
    const omadaKrousis = users.filter(user => user.role === 'omada_krousis');
    
    console.log(`Βρέθηκαν ${areaManagers.length} Area Managers, ${coffeeSpecialists.length} Coffee Specialists, και ${omadaKrousis.length} Ομάδες Κρούσης`);
    
    if (areaManagers.length === 0 || coffeeSpecialists.length === 0) {
      console.error('Δεν βρέθηκαν αρκετοί χρήστες για να δημιουργηθούν δοκιμαστικά καταστήματα.');
      process.exit(1);
    }
    
    // Δοκιμαστικά καταστήματα
    const testStores = [
      { name: 'Σύνταγμα', area_manager: areaManagers[0]?.id, coffee_specialist: coffeeSpecialists[0]?.id, omada_krousis: omadaKrousis[0]?.id },
      { name: 'Ομόνοια', area_manager: areaManagers[0]?.id, coffee_specialist: coffeeSpecialists[0]?.id, omada_krousis: null },
      { name: 'Μοσχάτο', area_manager: areaManagers.length > 1 ? areaManagers[1]?.id : areaManagers[0]?.id, coffee_specialist: coffeeSpecialists[0]?.id, omada_krousis: null },
      { name: 'Σοφοκλέους', area_manager: areaManagers[0]?.id, coffee_specialist: coffeeSpecialists.length > 1 ? coffeeSpecialists[1]?.id : coffeeSpecialists[0]?.id, omada_krousis: omadaKrousis[0]?.id }
    ];
    
    // Προσθήκη καταστημάτων στον πίνακα network_stores
    for (const store of testStores) {
      console.log(`Προσθήκη καταστήματος: ${store.name}`);
      
      // Προσθήκη στον πίνακα network_stores
      const [result] = await pool.query(
        "INSERT INTO network_stores (name, area_manager, coffee_specialist, omada_krousis, created_at) VALUES (?, ?, ?, ?, NOW())",
        [store.name, store.area_manager, store.coffee_specialist, store.omada_krousis]
      );
      
      console.log(`Το κατάστημα ${store.name} προστέθηκε με ID: ${result.insertId}`);
      
      // Προσθήκη στον πίνακα stores για κάθε αντιστοίχιση
      if (store.area_manager) {
        await pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [store.name, store.area_manager]
        );
        console.log(`Προστέθηκε αντιστοίχιση με Area Manager (ID: ${store.area_manager})`);
      }
      
      if (store.coffee_specialist) {
        await pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [store.name, store.coffee_specialist]
        );
        console.log(`Προστέθηκε αντιστοίχιση με Coffee Specialist (ID: ${store.coffee_specialist})`);
      }
      
      if (store.omada_krousis) {
        await pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [store.name, store.omada_krousis]
        );
        console.log(`Προστέθηκε αντιστοίχιση με Ομάδα Κρούσης (ID: ${store.omada_krousis})`);
      }
    }
    
    console.log('Η προσθήκη δοκιμαστικών καταστημάτων ολοκληρώθηκε επιτυχώς!');
    process.exit(0);
  } catch (error) {
    console.error('Σφάλμα κατά την προσθήκη δοκιμαστικών καταστημάτων:', error);
    process.exit(1);
  }
}

// Εκτέλεση της συνάρτησης
addTestStores();
