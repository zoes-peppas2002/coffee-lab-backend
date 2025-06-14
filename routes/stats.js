const express = require("express");
const router = express.Router();
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// GET: Top stores by average score for a specific month
router.get("/top-stores", async (req, res) => {
  const pool = req.pool;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    console.log(`Fetching top stores for period: ${startDate} to ${endDate}`);

    // Query to get average scores by store for area_manager and coffee_specialist roles
    const query = `
      SELECT 
        s.id AS store_id,
        s.name AS store_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count
      FROM 
        checklists c
      JOIN 
        stores s ON c.store_id = s.id
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND u.role IN ('area_manager', 'coffee_specialist')
        AND c.has_zero_cutoff = 0
      GROUP BY 
        s.id, u.role
      ORDER BY 
        s.name, u.role
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    
    // Process the results to calculate combined average scores
    const storeScores = {};
    
    rows.forEach(row => {
      // Use store_name as the key for grouping instead of store_id
      if (!storeScores[row.store_name]) {
        storeScores[row.store_name] = {
          store_id: row.store_id, // Keep the first store_id we encounter
          store_name: row.store_name,
          roles: {},
          total_avg: 0,
          checklist_count: 0
        };
      }
      
      storeScores[row.store_name].roles[row.role] = {
        avg_score: parseFloat(row.avg_score),
        checklist_count: row.checklist_count
      };
      
      storeScores[row.store_name].checklist_count += row.checklist_count;
    });
    
    // Calculate combined average for each store
    Object.values(storeScores).forEach(store => {
      let totalScore = 0;
      let roleCount = 0;
      
      // Get scores from both roles if available
      if (store.roles['area_manager']) {
        totalScore += store.roles['area_manager'].avg_score;
        roleCount++;
      }
      
      if (store.roles['coffee_specialist']) {
        totalScore += store.roles['coffee_specialist'].avg_score;
        roleCount++;
      }
      
      // Calculate the average if we have scores
      if (roleCount > 0) {
        store.total_avg = totalScore / roleCount;
      }
    });
    
    // Convert to array and sort by total_avg in descending order
    const result = Object.values(storeScores)
      .sort((a, b) => b.total_avg - a.total_avg)
      .map(store => ({
        store_id: store.store_id,
        store_name: store.store_name,
        area_manager_score: store.roles['area_manager'] ? store.roles['area_manager'].avg_score.toFixed(2) : null,
        coffee_specialist_score: store.roles['coffee_specialist'] ? store.roles['coffee_specialist'].avg_score.toFixed(2) : null,
        total_avg: store.total_avg.toFixed(2),
        checklist_count: store.checklist_count
      }));
    
    res.json(result);
  } catch (err) {
    console.error("Error fetching top stores:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Export top stores to Excel
router.get("/export-top-stores", async (req, res) => {
  const pool = req.pool;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;
    
    // Get month name in Greek
    const monthNames = [
      "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
      "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
    ];
    const monthName = monthNames[parseInt(month) - 1];

    console.log(`Exporting top stores for period: ${startDate} to ${endDate}`);

    // Query to get average scores by store for area_manager and coffee_specialist roles
    const query = `
      SELECT 
        s.id AS store_id,
        s.name AS store_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count
      FROM 
        checklists c
      JOIN 
        stores s ON c.store_id = s.id
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND u.role IN ('area_manager', 'coffee_specialist')
        AND c.has_zero_cutoff = 0
      GROUP BY 
        s.id, u.role
      ORDER BY 
        s.name, u.role
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    
    // Process the results to calculate combined average scores
    const storeScores = {};
    
    rows.forEach(row => {
      // Use store_name as the key for grouping instead of store_id
      if (!storeScores[row.store_name]) {
        storeScores[row.store_name] = {
          store_id: row.store_id, // Keep the first store_id we encounter
          store_name: row.store_name,
          roles: {},
          total_avg: 0,
          checklist_count: 0
        };
      }
      
      storeScores[row.store_name].roles[row.role] = {
        avg_score: parseFloat(row.avg_score),
        checklist_count: row.checklist_count
      };
      
      storeScores[row.store_name].checklist_count += row.checklist_count;
    });
    
    // Calculate combined average for each store
    Object.values(storeScores).forEach(store => {
      let totalScore = 0;
      let roleCount = 0;
      
      // Get scores from both roles if available
      if (store.roles['area_manager']) {
        totalScore += store.roles['area_manager'].avg_score;
        roleCount++;
      }
      
      if (store.roles['coffee_specialist']) {
        totalScore += store.roles['coffee_specialist'].avg_score;
        roleCount++;
      }
      
      // Calculate the average if we have scores
      if (roleCount > 0) {
        store.total_avg = totalScore / roleCount;
      }
    });
    
    // Convert to array and sort by total_avg in descending order
    const result = Object.values(storeScores)
      .sort((a, b) => b.total_avg - a.total_avg)
      .map(store => ({
        store_id: store.store_id,
        store_name: store.store_name,
        area_manager_score: store.roles['area_manager'] ? store.roles['area_manager'].avg_score.toFixed(2) : null,
        coffee_specialist_score: store.roles['coffee_specialist'] ? store.roles['coffee_specialist'].avg_score.toFixed(2) : null,
        total_avg: store.total_avg.toFixed(2),
        checklist_count: store.checklist_count
      }));
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Lab App';
    workbook.lastModifiedBy = 'Coffee Lab App';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add a worksheet
    const worksheet = workbook.addWorksheet(`Top Καταστήματα - ${monthName} ${year}`);
    
    // Add columns
    worksheet.columns = [
      { header: 'Κατάστημα', key: 'store_name', width: 30 },
      { header: 'Area Manager', key: 'area_manager_score', width: 15 },
      { header: 'Coffee Specialist', key: 'coffee_specialist_score', width: 15 },
      { header: 'Μέσος Όρος', key: 'total_avg', width: 15 },
      { header: 'Πλήθος Checklists', key: 'checklist_count', width: 20 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Add rows
    result.forEach(store => {
      worksheet.addRow({
        store_name: store.store_name,
        area_manager_score: store.area_manager_score || '-',
        coffee_specialist_score: store.coffee_specialist_score || '-',
        total_avg: store.total_avg,
        checklist_count: store.checklist_count
      });
    });
    
    // Style the data
    for (let i = 2; i <= result.length + 1; i++) {
      // Add % to score columns
      const row = worksheet.getRow(i);
      
      if (row.getCell('area_manager_score').value !== '-') {
        row.getCell('area_manager_score').value = `${row.getCell('area_manager_score').value}%`;
      }
      
      if (row.getCell('coffee_specialist_score').value !== '-') {
        row.getCell('coffee_specialist_score').value = `${row.getCell('coffee_specialist_score').value}%`;
      }
      
      row.getCell('total_avg').value = `${row.getCell('total_avg').value}%`;
      
      // Bold the total_avg column
      row.getCell('total_avg').font = { bold: true };
      
      // Alternate row colors
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        };
      }
    }
    
    // Create directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'static', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename
    const filename = `top_stores_${year}_${month}.xlsx`;
    const filepath = path.join(exportsDir, filename);
    
    // Write to file
    await workbook.xlsx.writeFile(filepath);
    
    // Send the file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
      
      // Delete the file after sending
      setTimeout(() => {
        fs.unlink(filepath, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }, 60000); // Delete after 1 minute
    });
  } catch (err) {
    console.error("Error exporting top stores:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Top users by role for a specific month
router.get("/top-users", async (req, res) => {
  const pool = req.pool;
  const { month, year, role } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    console.log(`Fetching top users for period: ${startDate} to ${endDate}, role: ${role || 'all'}`);

    // Base query to get average scores by user
    let query = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count,
        COUNT(DISTINCT c.store_id) AS store_count
      FROM 
        checklists c
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND c.has_zero_cutoff = 0
    `;
    
    const queryParams = [startDate, endDate];
    
    // Add role filter if specified
    if (role) {
      query += ` AND u.role = ?`;
      queryParams.push(role);
    }
    
    // Group by user and order by average score
    query += `
      GROUP BY 
        u.id
      ORDER BY 
        avg_score DESC
    `;

    const [rows] = await pool.query(query, queryParams);
    
    // Process the results
    const result = rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      role: row.role,
      avg_score: parseFloat(row.avg_score).toFixed(2),
      checklist_count: row.checklist_count,
      store_count: row.store_count
    }));
    
    res.json(result);
  } catch (err) {
    console.error("Error fetching top users:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Top user across all roles for a specific month
router.get("/top-of-top", async (req, res) => {
  const pool = req.pool;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    console.log(`Fetching top of top for period: ${startDate} to ${endDate}`);

    // Query to get the top user across all roles (excluding omada_krousis)
    const query = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count,
        COUNT(DISTINCT c.store_id) AS store_count
      FROM 
        checklists c
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND c.has_zero_cutoff = 0
        AND u.role != 'omada_krousis'
      GROUP BY 
        u.id
      ORDER BY 
        avg_score DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    
    if (rows.length === 0) {
      return res.json(null);
    }
    
    // Process the result
    const topUser = {
      user_id: rows[0].user_id,
      user_name: rows[0].user_name,
      role: rows[0].role,
      avg_score: parseFloat(rows[0].avg_score).toFixed(2),
      checklist_count: rows[0].checklist_count,
      store_count: rows[0].store_count
    };
    
    res.json(topUser);
  } catch (err) {
    console.error("Error fetching top of top:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Export top users to Excel
router.get("/export-top-users", async (req, res) => {
  const pool = req.pool;
  const { month, year, role } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;
    
    // Get month name in Greek
    const monthNames = [
      "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
      "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
    ];
    const monthName = monthNames[parseInt(month) - 1];

    console.log(`Exporting top users for period: ${startDate} to ${endDate}, role: ${role || 'all'}`);

    // Base query to get average scores by user
    let query = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count,
        COUNT(DISTINCT c.store_id) AS store_count
      FROM 
        checklists c
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND c.has_zero_cutoff = 0
    `;
    
    const queryParams = [startDate, endDate];
    
    // Add role filter if specified
    if (role) {
      query += ` AND u.role = ?`;
      queryParams.push(role);
    }
    
    // Group by user and order by average score
    query += `
      GROUP BY 
        u.id
      ORDER BY 
        avg_score DESC
    `;

    const [rows] = await pool.query(query, queryParams);
    
    // Process the results
    const result = rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name,
      role: row.role,
      avg_score: parseFloat(row.avg_score).toFixed(2),
      checklist_count: row.checklist_count,
      store_count: row.store_count
    }));
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Lab App';
    workbook.lastModifiedBy = 'Coffee Lab App';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add a worksheet
    let worksheetTitle = `Top Ομάδας - ${monthName} ${year}`;
    if (role) {
      // Map API role to display name
      const roleDisplayNames = {
        'area_manager': 'Area Manager',
        'coffee_specialist': 'Coffee Specialist',
        'omada_krousis': 'Ομάδα Κρούσης'
      };
      const displayRole = roleDisplayNames[role] || role;
      worksheetTitle = `Top ${displayRole} - ${monthName} ${year}`;
    }
    
    const worksheet = workbook.addWorksheet(worksheetTitle);
    
    // Add columns
    worksheet.columns = [
      { header: 'Όνομα', key: 'user_name', width: 30 },
      { header: 'Ρόλος', key: 'role', width: 20 },
      { header: 'Μ.Ο. Checklists', key: 'avg_score', width: 15 },
      { header: 'Πλήθος Checklists', key: 'checklist_count', width: 20 },
      { header: 'Καταστήματα', key: 'store_count', width: 15 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Add rows
    result.forEach(user => {
      worksheet.addRow({
        user_name: user.user_name,
        role: user.role,
        avg_score: user.avg_score,
        checklist_count: user.checklist_count,
        store_count: user.store_count
      });
    });
    
    // Style the data
    for (let i = 2; i <= result.length + 1; i++) {
      // Add % to score column
      const row = worksheet.getRow(i);
      row.getCell('avg_score').value = `${row.getCell('avg_score').value}%`;
      
      // Bold the avg_score column
      row.getCell('avg_score').font = { bold: true };
      
      // Alternate row colors
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        };
      }
    }
    
    // Create directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'static', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename
    let filename = `top_users_${year}_${month}.xlsx`;
    if (role) {
      filename = `top_users_${role}_${year}_${month}.xlsx`;
    }
    const filepath = path.join(exportsDir, filename);
    
    // Write to file
    await workbook.xlsx.writeFile(filepath);
    
    // Send the file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
      
      // Delete the file after sending
      setTimeout(() => {
        fs.unlink(filepath, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }, 60000); // Delete after 1 minute
    });
  } catch (err) {
    console.error("Error exporting top users:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Export top of top to Excel
router.get("/export-top-of-top", async (req, res) => {
  const pool = req.pool;
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    // Format date range for the selected month
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;
    
    // Get month name in Greek
    const monthNames = [
      "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
      "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"
    ];
    const monthName = monthNames[parseInt(month) - 1];

    console.log(`Exporting top of top for period: ${startDate} to ${endDate}`);

    // Query to get the top user across all roles
    const query = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count,
        COUNT(DISTINCT c.store_id) AS store_count
      FROM 
        checklists c
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND c.has_zero_cutoff = 0
      GROUP BY 
        u.id
      ORDER BY 
        avg_score DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "No data found for the selected month" });
    }
    
    // Process the result
    const topUser = {
      user_id: rows[0].user_id,
      user_name: rows[0].user_name,
      role: rows[0].role,
      avg_score: parseFloat(rows[0].avg_score).toFixed(2),
      checklist_count: rows[0].checklist_count,
      store_count: rows[0].store_count
    };
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coffee Lab App';
    workbook.lastModifiedBy = 'Coffee Lab App';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add a worksheet
    const worksheet = workbook.addWorksheet(`Top Of Our Top - ${monthName} ${year}`);
    
    // Add a congratulatory message
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '🏆 ΣΥΓΧΑΡΗΤΗΡΙΑ!!! 🏆';
    titleCell.font = { bold: true, size: 16, color: { argb: '28A745' } };
    titleCell.alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:E2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Ο/Η ${topUser.user_name} είναι στην κορυφή για τον ${monthName} ${year}!`;
    subtitleCell.font = { bold: true, size: 14 };
    subtitleCell.alignment = { horizontal: 'center' };
    
    // Add details
    worksheet.addRow([]);
    worksheet.addRow(['Στοιχεία', '']);
    worksheet.addRow(['Όνομα:', topUser.user_name]);
    worksheet.addRow(['Ρόλος:', topUser.role]);
    worksheet.addRow(['Μέσος Όρος:', `${topUser.avg_score}%`]);
    worksheet.addRow(['Πλήθος Checklists:', topUser.checklist_count]);
    worksheet.addRow(['Καταστήματα:', topUser.store_count]);
    
    // Style the details
    for (let i = 5; i <= 9; i++) {
      worksheet.getCell(`A${i}`).font = { bold: true };
      if (i === 7) { // Avg score row
        worksheet.getCell(`B${i}`).font = { bold: true, color: { argb: '28A745' } };
      }
    }
    
    // Add all users for comparison
    worksheet.addRow([]);
    worksheet.addRow(['Όλοι οι χρήστες για σύγκριση:']);
    
    // Add header row for all users
    const headerRow = worksheet.addRow(['Όνομα', 'Ρόλος', 'Μ.Ο. Checklists', 'Πλήθος Checklists', 'Καταστήματα']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    
    // Query to get all users (excluding omada_krousis for consistency)
    const allUsersQuery = `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.role,
        AVG(c.total_score) AS avg_score,
        COUNT(c.id) AS checklist_count,
        COUNT(DISTINCT c.store_id) AS store_count
      FROM 
        checklists c
      JOIN 
        users u ON c.user_id = u.id
      WHERE 
        DATE(c.submit_date) BETWEEN ? AND ?
        AND c.has_zero_cutoff = 0
      GROUP BY 
        u.id
      ORDER BY 
        avg_score DESC
    `;
    
    const [allUsers] = await pool.query(allUsersQuery, [startDate, endDate]);
    
    // Add all users
    let rowIndex = 13; // Starting row for all users
    allUsers.forEach((user, index) => {
      const row = worksheet.addRow([
        user.name,
        user.role,
        `${parseFloat(user.avg_score).toFixed(2)}%`,
        user.checklist_count,
        user.store_count
      ]);
      
      // Highlight the top user
      if (user.id === topUser.user_id) {
        row.font = { bold: true };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE0' } // Light yellow
        };
      } else if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        };
      }
      
      rowIndex++;
    });
    
    // Adjust column widths
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Create directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'static', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename
    const filename = `top_of_top_${year}_${month}.xlsx`;
    const filepath = path.join(exportsDir, filename);
    
    // Write to file
    await workbook.xlsx.writeFile(filepath);
    
    // Send the file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
      
      // Delete the file after sending
      setTimeout(() => {
        fs.unlink(filepath, (err) => {
          if (err) console.error('Error deleting temporary file:', err);
        });
      }, 60000); // Delete after 1 minute
    });
  } catch (err) {
    console.error("Error exporting top of top:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

module.exports = router;
