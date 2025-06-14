const express = require("express");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🟡 Received login:", { email, password });

  try {
    const [rows] = await req.pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    console.log("🔍 Query result:", rows);

    if (rows.length === 0) {
      console.log("🔴 User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    console.log("✅ Found user:", user);

    // string σύγκριση με base password
    if (user.password !== password) {
      console.log("❌ Wrong password. DB:", user.password, "| Input:", password);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("🟢 Login success!");
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

  } catch (err) {
    console.error("🔥 ERROR during login:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
