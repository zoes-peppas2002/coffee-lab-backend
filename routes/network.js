const express = require("express");
const router = express.Router();

// GET: Λίστα όλων των καταστημάτων με τους αντίστοιχους χρήστες
router.get("/", async (req, res) => {
  try {
    const [rows] = await req.pool.query(`
      SELECT 
        s.id,
        s.name,
        s.area_manager,
        s.coffee_specialist
      FROM 
        network_stores s
      ORDER BY 
        s.name
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching network stores:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: Προσθήκη νέου καταστήματος στο δίκτυο
router.post("/", async (req, res) => {
  const { name, area_manager, coffee_specialist } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Store name is required" });
  }
  
  try {
    console.log("Προσθήκη νέου καταστήματος:", { name, area_manager, coffee_specialist });
    
    // Έλεγχος αν υπάρχει ήδη κατάστημα με το ίδιο όνομα
    const [existingStores] = await req.pool.query(
      "SELECT * FROM network_stores WHERE name = ?",
      [name]
    );
    
    if (existingStores.length > 0) {
      console.log("Υπάρχει ήδη κατάστημα με το όνομα:", name);
      return res.status(400).json({ error: "Υπάρχει ήδη κατάστημα με αυτό το όνομα" });
    }
    
    // Έλεγχος αν οι χρήστες υπάρχουν
    if (area_manager) {
      const [areaManagerExists] = await req.pool.query(
        "SELECT * FROM users WHERE id = ? AND role = 'area_manager'",
        [area_manager]
      );
      
      if (areaManagerExists.length === 0) {
        console.log("Δεν βρέθηκε ο Area Manager με ID:", area_manager);
        return res.status(400).json({ error: "Ο επιλεγμένος Area Manager δεν υπάρχει" });
      }
    }
    
    if (coffee_specialist) {
      const [coffeeSpecialistExists] = await req.pool.query(
        "SELECT * FROM users WHERE id = ? AND role = 'coffee_specialist'",
        [coffee_specialist]
      );
      
      if (coffeeSpecialistExists.length === 0) {
        console.log("Δεν βρέθηκε ο Coffee Specialist με ID:", coffee_specialist);
        return res.status(400).json({ error: "Ο επιλεγμένος Coffee Specialist δεν υπάρχει" });
      }
    }
    
    
    // Προσθήκη στον πίνακα network_stores
    const [result] = await req.pool.query(
      "INSERT INTO network_stores (name, area_manager, coffee_specialist, created_at) VALUES (?, ?, ?, NOW())",
      [name, area_manager || null, coffee_specialist || null]
    );
    
    console.log("Το κατάστημα προστέθηκε στον πίνακα network_stores με ID:", result.insertId);
    
    // Αν έχει οριστεί area_manager, δημιουργούμε εγγραφή στον πίνακα stores
    if (area_manager) {
      try {
        await req.pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [name, area_manager]
        );
        console.log("Προστέθηκε αντιστοίχιση με Area Manager:", area_manager);
      } catch (storeErr) {
        console.error("Σφάλμα κατά την προσθήκη αντιστοίχισης με Area Manager:", storeErr);
        // Συνεχίζουμε με τις άλλες αντιστοιχίσεις
      }
    }
    
    // Αν έχει οριστεί coffee_specialist, δημιουργούμε εγγραφή στον πίνακα stores
    if (coffee_specialist) {
      try {
        await req.pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [name, coffee_specialist]
        );
        console.log("Προστέθηκε αντιστοίχιση με Coffee Specialist:", coffee_specialist);
      } catch (storeErr) {
        console.error("Σφάλμα κατά την προσθήκη αντιστοίχισης με Coffee Specialist:", storeErr);
        // Συνεχίζουμε με τις άλλες αντιστοιχίσεις
      }
    }
    
    
    res.status(201).json({ 
      message: "Network store added successfully", 
      id: result.insertId 
    });
  } catch (err) {
    console.error("Error adding network store:", err);
    
    // Πιο λεπτομερής χειρισμός σφαλμάτων
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Υπάρχει ήδη κατάστημα με αυτό το όνομα" });
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: "Ένας από τους επιλεγμένους χρήστες δεν υπάρχει" });
    } else {
      return res.status(500).json({ error: "Σφάλμα κατά την προσθήκη του καταστήματος: " + err.message });
    }
  }
});

// PUT: Ενημέρωση καταστήματος στο δίκτυο
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, area_manager, coffee_specialist } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Store name is required" });
  }
  
  try {
    // Παίρνουμε τα τρέχοντα δεδομένα του καταστήματος
    const [currentStore] = await req.pool.query(
      "SELECT * FROM network_stores WHERE id = ?",
      [id]
    );
    
    if (currentStore.length === 0) {
      return res.status(404).json({ error: "Network store not found" });
    }
    
    const current = currentStore[0];
    
    // Ενημερώνουμε το κατάστημα στον πίνακα network_stores
    await req.pool.query(
      "UPDATE network_stores SET name = ?, area_manager = ?, coffee_specialist = ? WHERE id = ?",
      [name, area_manager || null, coffee_specialist || null, id]
    );
    
    // Διαχείριση area_manager
    try {
      if (current.area_manager !== area_manager) {
        // Αν υπήρχε προηγούμενος area_manager, διαγράφουμε την εγγραφή
        if (current.area_manager) {
          await req.pool.query(
            "DELETE FROM stores WHERE name = ? AND assigned_to = ?",
            [current.name, current.area_manager]
          );
        }
        
        // Αν υπάρχει νέος area_manager, δημιουργούμε νέα εγγραφή
        if (area_manager) {
          await req.pool.query(
            "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
            [name, area_manager]
          );
        }
      } else if (current.name !== name && current.area_manager) {
        // Αν άλλαξε μόνο το όνομα, ενημερώνουμε την εγγραφή
        await req.pool.query(
          "UPDATE stores SET name = ? WHERE name = ? AND assigned_to = ?",
          [name, current.name, current.area_manager]
        );
      }
    } catch (err) {
      console.error("Σφάλμα κατά την ενημέρωση του area_manager:", err);
      // Συνεχίζουμε με τις άλλες ενημερώσεις
    }
    
    // Διαχείριση coffee_specialist
    try {
      if (current.coffee_specialist !== coffee_specialist) {
        // Αν υπήρχε προηγούμενος coffee_specialist, διαγράφουμε την εγγραφή
        if (current.coffee_specialist) {
          await req.pool.query(
            "DELETE FROM stores WHERE name = ? AND assigned_to = ?",
            [current.name, current.coffee_specialist]
          );
        }
        
        // Αν υπάρχει νέος coffee_specialist, δημιουργούμε νέα εγγραφή
        if (coffee_specialist) {
          await req.pool.query(
            "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
            [name, coffee_specialist]
          );
        }
      } else if (current.name !== name && current.coffee_specialist) {
        // Αν άλλαξε μόνο το όνομα, ενημερώνουμε την εγγραφή
        await req.pool.query(
          "UPDATE stores SET name = ? WHERE name = ? AND assigned_to = ?",
          [name, current.name, current.coffee_specialist]
        );
      }
    } catch (err) {
      console.error("Σφάλμα κατά την ενημέρωση του coffee_specialist:", err);
      // Συνεχίζουμε με τις άλλες ενημερώσεις
    }
    
    
    res.json({ message: "Network store updated successfully" });
  } catch (err) {
    console.error("Error updating network store:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE: Διαγραφή καταστήματος από το δίκτυο
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    // Παίρνουμε τα δεδομένα του καταστήματος πριν το διαγράψουμε
    const [store] = await req.pool.query(
      "SELECT * FROM network_stores WHERE id = ?",
      [id]
    );
    
    if (store.length === 0) {
      return res.status(404).json({ error: "Network store not found" });
    }
    
    const { name, area_manager, coffee_specialist } = store[0];
    
    // Διαγράφουμε το κατάστημα από τον πίνακα network_stores
    await req.pool.query("DELETE FROM network_stores WHERE id = ?", [id]);
    
    // Διαγράφουμε τις αντίστοιχες εγγραφές από τον πίνακα stores
    if (area_manager) {
      await req.pool.query(
        "DELETE FROM stores WHERE name = ? AND assigned_to = ?",
        [name, area_manager]
      );
    }
    
    if (coffee_specialist) {
      await req.pool.query(
        "DELETE FROM stores WHERE name = ? AND assigned_to = ?",
        [name, coffee_specialist]
      );
    }
    
    
    res.json({ message: "Network store deleted successfully" });
  } catch (err) {
    console.error("Error deleting network store:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
