
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, assigned_to } = req.body;
  try {
    // Έλεγχος αν υπάρχει ήδη κατάστημα με το ίδιο όνομα και assigned_to
    const [existingStores] = await req.pool.query(
      "SELECT * FROM stores WHERE name = ? AND assigned_to = ?",
      [name, assigned_to]
    );
    
    if (existingStores.length > 0) {
      return res.status(400).json({ error: "Υπάρχει ήδη κατάστημα με αυτό το όνομα για τον συγκεκριμένο χρήστη" });
    }
    
    try {
      // Αν δεν υπάρχει, προσθέτουμε το νέο κατάστημα
      const [result] = await req.pool.query(
        "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
        [name, assigned_to]
      );
      res.status(201).json({ message: "Store added successfully", id: result.insertId });
    } catch (insertErr) {
      // Αν υπάρχει περιορισμός μοναδικότητας στο όνομα του καταστήματος,
      // προσπαθούμε να προσθέσουμε το κατάστημα με ένα μικρό suffix στο όνομα
      if (insertErr.code === 'ER_DUP_ENTRY') {
        const uniqueName = `${name} (${assigned_to})`;
        const [resultWithSuffix] = await req.pool.query(
          "INSERT INTO stores (name, assigned_to, created_at) VALUES (?, ?, NOW())",
          [uniqueName, assigned_to]
        );
        res.status(201).json({ message: "Store added successfully with modified name", id: resultWithSuffix.insertId });
      } else {
        throw insertErr; // Αν είναι άλλο σφάλμα, το προωθούμε
      }
    }
  } catch (err) {
    console.error("Error inserting store:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/assigned/:user", async (req, res) => {
  const user = req.params.user;
  try {
    const [rows] = await req.pool.query("SELECT * FROM stores WHERE assigned_to = ?", [user]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching stores:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", async (req, res) => {
  const storeId = req.params.id;
  try {
    await req.pool.query("DELETE FROM stores WHERE id = ?", [storeId]);
    res.json({ message: "Store deleted successfully" });
  } catch (err) {
    console.error("Error deleting store:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/by-user/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    // Επιστρέφουμε μόνο τα καταστήματα που έχουν ανατεθεί στον χρήστη
    // ανεξάρτητα από τον ρόλο του
    const [rows] = await req.pool.query("SELECT id, name FROM stores WHERE assigned_to = ?", [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching stores for user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
