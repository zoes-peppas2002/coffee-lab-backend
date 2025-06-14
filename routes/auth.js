const express = require("express");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🟡 Received login:", { email, password });

  try {
    // Determine if we're using PostgreSQL or MySQL
    const isPg = process.env.NODE_ENV === 'production';
    console.log(`Using ${isPg ? 'PostgreSQL' : 'MySQL'} for login query`);
    
    let rows;
    if (isPg) {
      // PostgreSQL query
      const result = await req.pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      rows = result.rows;
      console.log("🔍 PostgreSQL Query result:", rows);
    } else {
      // MySQL query
      const [result] = await req.pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      rows = result;
      console.log("🔍 MySQL Query result:", rows);
    }

    if (!rows || rows.length === 0) {
      console.log("🔴 User not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    console.log("✅ Found user:", user);
    console.log("✅ User role:", user.role);
    console.log("✅ User password in DB:", user.password);
    console.log("✅ Input password:", password);

    // string σύγκριση με base password
    if (user.password !== password) {
      console.log("❌ Wrong password. DB:", user.password, "| Input:", password);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("🟢 Login success!");
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    console.log("🟢 Sending user data:", userData);
    res.json(userData);

  } catch (err) {
    console.error("🔥 ERROR during login:", err);
    console.error("🔥 Error details:", err.message);
    if (err.stack) console.error("🔥 Stack trace:", err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = router;
