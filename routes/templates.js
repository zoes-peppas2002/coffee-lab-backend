const express = require("express");
const router = express.Router();

// Test endpoint to check database connection
router.get("/test-db", async (req, res) => {
  try {
    const [result] = await req.pool.query("SELECT 1 as test");
    console.log("Database connection test result:", result);
    res.json({ success: true, message: "Database connection successful", result });
  } catch (err) {
    console.error("Database connection test error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test endpoint to check table structure
router.get("/test-table", async (req, res) => {
  try {
    const [columns] = await req.pool.query("SHOW COLUMNS FROM checklist_templates");
    console.log("Table structure:", columns);
    
    // Try to insert a test record
    try {
      const testRole = 'area_manager';
      const testData = JSON.stringify([{name: 'Test Category', weight: '0.5', subcategories: [{name: 'Test Subcategory', critical: false}]}]);
      
      await req.pool.query(
        "INSERT INTO checklist_templates (role, template_data) VALUES (?, ?)",
        [testRole, testData]
      );
      console.log("Test record inserted successfully");
    } catch (insertErr) {
      console.error("Error inserting test record:", insertErr);
    }
    
    res.json({ success: true, tableStructure: columns });
  } catch (err) {
    console.error("Error checking table structure:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test endpoint to force insert a record
router.get("/force-insert", async (req, res) => {
  try {
    // Create a test template
    const testRole = 'area_manager';
    const testCategories = [
      {
        name: 'Test Category 1',
        weight: 0.6,
        subcategories: [
          { name: 'Test Subcategory 1', critical: false },
          { name: 'Test Subcategory 2', critical: true }
        ]
      },
      {
        name: 'Test Category 2',
        weight: 0.4,
        subcategories: [
          { name: 'Test Subcategory 3', critical: false }
        ]
      }
    ];
    
    console.log("Attempting to force insert a record");
    console.log("Role:", testRole);
    console.log("Categories:", testCategories);
    
    // Convert categories to JSON string
    const testData = JSON.stringify(testCategories);
    console.log("JSON data:", testData);
    
    // Insert directly into the database
    const [result] = await req.pool.query(
      "INSERT INTO checklist_templates (role, template_data) VALUES (?, ?)",
      [testRole, testData]
    );
    
    console.log("Force insert result:", result);
    
    // Check if the record was inserted
    const [records] = await req.pool.query(
      "SELECT * FROM checklist_templates ORDER BY id DESC LIMIT 1"
    );
    
    res.json({ 
      success: true, 
      message: "Force insert completed", 
      insertResult: result,
      latestRecord: records[0]
    });
  } catch (err) {
    console.error("Force insert error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      sqlState: err.sqlState,
      errno: err.errno,
      code: err.code
    });
  }
});

// Αποθήκευση νέου template checklist
router.post("/", async (req, res) => {
  console.log("POST /api/templates - Request received");
  console.log("Request body:", req.body);
  
  if (!req.body) {
    console.error("Request body is empty");
    return res.status(400).json({ error: "Request body is empty" });
  }
  
  const { role, categories } = req.body;
  console.log("Extracted role:", role);
  console.log("Extracted categories:", categories);
  
  if (!role) {
    console.error("Role is missing");
    return res.status(400).json({ error: "Role is required" });
  }
  
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    console.error("Categories are missing or invalid");
    return res.status(400).json({ error: "Categories are required and must be an array" });
  }
  
  try {
    console.log("Attempting to save with role:", role);
    console.log("SQL: INSERT INTO checklist_templates (role, template_data) VALUES (?, ?)", [role, JSON.stringify(categories)]);
    
    // Check if the pool is available
    if (!req.pool) {
      console.error("Database pool is not available");
      return res.status(500).json({ error: "Database connection error" });
    }
    
    const result = await req.pool.query(
        "INSERT INTO checklist_templates (role, template_data) VALUES (?, ?)",
        [role, JSON.stringify(categories)]
        );
    
    console.log("Query result:", result);
    console.log("Template saved successfully");
    res.status(201).json({ message: "Template saved" });
  } catch (err) {
    console.error("DB Error:", err);
    console.error("Error details:", err.message);
    console.error("SQL State:", err.sqlState);
    console.error("Error Number:", err.errno);
    
    // Check if it's a data validation error
    if (err.sqlState === '23000') {
      console.error("Data validation error - possibly invalid role value");
    }
    
    res.status(500).json({ error: "Failed to save template" });
  }
});

// Λήψη όλων των templates
router.get("/all", async (req, res) => {
  console.log("GET /api/templates/all - Request received");
  try {
    console.log("Executing query: SELECT * FROM checklist_templates ORDER BY created_at DESC");
    const [rows] = await req.pool.query(
      "SELECT * FROM checklist_templates ORDER BY created_at DESC"
    );
    console.log("Query result:", rows);
    console.log("Number of templates found:", rows.length);
    
    // Log each template
    rows.forEach((template, index) => {
      console.log(`Template ${index + 1}:`, {
        id: template.id,
        role: template.role,
        created_at: template.created_at,
        template_data_length: template.template_data ? template.template_data.length : 0
      });
    });
    
    res.json(rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Λήψη τελευταίου template για ρόλο
router.get("/latest", async (req, res) => {
  const { role } = req.query;
  try {
    const [rows] = await req.pool.query(
      "SELECT * FROM checklist_templates WHERE role = ? ORDER BY created_at DESC LIMIT 1",
      [role]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No template found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Λήψη συγκεκριμένου template με ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  console.log("GET /api/templates/:id - Request received");
  console.log("Template ID:", id);
  
  try {
    console.log("Executing query: SELECT * FROM checklist_templates WHERE id = ?", [id]);
    const [rows] = await req.pool.query(
      "SELECT * FROM checklist_templates WHERE id = ?",
      [id]
    );
    
    console.log("Query result:", rows);
    console.log("Number of templates found:", rows.length);
    
    if (rows.length === 0) {
      console.log("Template not found with ID:", id);
      return res.status(404).json({ error: "Template not found" });
    }
    
    const template = rows[0];
    console.log("Template found:", {
      id: template.id,
      role: template.role,
      created_at: template.created_at,
      template_data_length: template.template_data ? template.template_data.length : 0
    });
    
    // Ensure template_data is valid JSON
    try {
      if (typeof template.template_data === 'string') {
        const parsed = JSON.parse(template.template_data);
        console.log("Template data parsed successfully");
        
        // Check if it's an array
        if (!Array.isArray(parsed)) {
          console.error("Template data is not an array:", parsed);
          // Convert to array if it's not already
          template.template_data = JSON.stringify([parsed]);
          console.log("Converted template data to array");
        }
      }
    } catch (parseErr) {
      console.error("Error parsing template data:", parseErr);
      // If it can't be parsed, set it to an empty array
      template.template_data = JSON.stringify([]);
      console.log("Set template data to empty array due to parsing error");
    }
    
    res.json(template);
  } catch (err) {
    console.error("DB Error:", err);
    console.error("Error details:", err.message);
    console.error("SQL State:", err.sqlState);
    console.error("Error Number:", err.errno);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Ενημέρωση template
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { role, categories } = req.body;
  
  console.log("PUT /api/templates/:id - Request received");
  console.log("Template ID:", id);
  console.log("Role:", role);
  console.log("Categories:", categories);
  
  if (!role || !categories || !Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }
  
  try {
    const [result] = await req.pool.query(
      "UPDATE checklist_templates SET role = ?, template_data = ? WHERE id = ?",
      [role, JSON.stringify(categories), id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    console.log("Template updated successfully");
    res.json({ message: "Template updated" });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Διαγραφή template
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  
  console.log("DELETE /api/templates/:id - Request received");
  console.log("Template ID:", id);
  
  try {
    // First check if the template exists
    console.log("Checking if template exists: SELECT id FROM checklist_templates WHERE id = ?", [id]);
    const [checkRows] = await req.pool.query(
      "SELECT id FROM checklist_templates WHERE id = ?",
      [id]
    );
    
    if (checkRows.length === 0) {
      console.log("Template not found with ID:", id);
      return res.status(404).json({ error: "Template not found" });
    }
    
    console.log("Template found, proceeding with deletion");
    console.log("Executing query: DELETE FROM checklist_templates WHERE id = ?", [id]);
    
    const [result] = await req.pool.query(
      "DELETE FROM checklist_templates WHERE id = ?",
      [id]
    );
    
    console.log("Delete result:", result);
    
    if (result.affectedRows === 0) {
      console.log("No rows affected by delete operation");
      return res.status(404).json({ error: "Template not found or could not be deleted" });
    }
    
    console.log("Template deleted successfully, affected rows:", result.affectedRows);
    res.json({ message: "Template deleted", result });
  } catch (err) {
    console.error("DB Error:", err);
    console.error("Error details:", err.message);
    console.error("SQL State:", err.sqlState);
    console.error("Error Number:", err.errno);
    res.status(500).json({ error: "Failed to delete template" });
  }
// ΝΕΟ GET template βάσει ρόλου
router.get("/", async (req, res) => {
  const pool = req.pool;
  const { role } = req.query;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM checklist_templates WHERE role = ? ORDER BY created_at DESC LIMIT 1",
      [role]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Template not found for this role" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



});


module.exports = router;
