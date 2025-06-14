const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const PDFDocument = require("pdfkit");
const multer = require("multer");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, '..', 'static', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// DELETE: Διαγραφή ενός checklist και του σχετικού PDF
router.delete("/:id", async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    // Βρίσκουμε πρώτα το checklist για να πάρουμε το path του PDF
    const [checklist] = await pool.query(
      "SELECT pdf_url FROM checklists WHERE id = ?",
      [id]
    );
    
    if (checklist.length === 0) {
      return res.status(404).json({ error: "Checklist not found" });
    }
    
    const pdfUrl = checklist[0].pdf_url;
    
    // Διαγραφή του checklist από τη βάση δεδομένων
    await pool.query("DELETE FROM checklists WHERE id = ?", [id]);
    
    // Διαγραφή του αρχείου PDF αν υπάρχει
    if (pdfUrl) {
      try {
        const pdfPath = path.join(__dirname, '..', pdfUrl.substring(1)); // Remove leading slash
        if (fs.existsSync(pdfPath)) {
          await unlinkAsync(pdfPath);
          console.log(`Deleted PDF file: ${pdfPath}`);
        }
      } catch (fileErr) {
        console.error(`Error deleting PDF file: ${fileErr.message}`);
        // Συνεχίζουμε ακόμα κι αν αποτύχει η διαγραφή του αρχείου
      }
    }
    
    res.json({ message: "Checklist deleted successfully" });
  } catch (err) {
    console.error("Error deleting checklist:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET: Όλα τα checklists ενός χρήστη
router.get("/my/:userId", async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM checklists WHERE user_id = ? ORDER BY submit_date DESC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching checklists:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET: Φιλτράρισμα checklists βάσει καταστήματος και ημερομηνίας
router.get("/filter", async (req, res) => {
  const pool = req.pool;
  const { store_id, start_date, end_date, user_id } = req.query;

  try {
    // Validate required parameters
    if (!store_id || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log(`Filtering checklists for store_id=${store_id}, date range: ${start_date} to ${end_date}`);
    
    // First, log all checklists to debug
    const [allRows] = await pool.query("SELECT id, store_id, user_id, submit_date, pdf_url FROM checklists");
    console.log("All checklists in database:", allRows);

    let query = `
      SELECT * FROM checklists 
      WHERE store_id = ? 
      AND DATE(submit_date) BETWEEN ? AND ?
    `;
    
    let params = [store_id, start_date, end_date];

    // Add user_id filter if provided
    if (user_id) {
      query += " AND user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY submit_date DESC";

    console.log("Executing query:", query);
    console.log("With parameters:", params);

    const [rows] = await pool.query(query, params);
    console.log(`Found ${rows.length} matching checklists`);
    
    res.json(rows);
  } catch (err) {
    console.error("Error filtering checklists:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
});

// GET: Template βάσει ρόλου
router.get("/template/:role", async (req, res) => {
  const pool = req.pool;
  const { role } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT template_data FROM checklist_templates WHERE role = ? ORDER BY created_at DESC LIMIT 1",
      [role]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Template not found" });

    const templateData = typeof rows[0].template_data === "string"
      ? JSON.parse(rows[0].template_data)
      : rows[0].template_data;

    res.json(templateData);
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: Υποβολή νέου checklist με PDF και score
router.post("/", upload.array('images', 10), async (req, res) => {
  const pool = req.pool;
  
  // Parse checklist_data from JSON string (since we're using FormData)
  let checklist_data, user_id, store_id, total_score, has_zero_cutoff;
  
  try {
    checklist_data = JSON.parse(req.body.checklist_data);
    user_id = req.body.user_id;
    store_id = req.body.store_id;
    total_score = req.body.total_score;
    has_zero_cutoff = req.body.has_zero_cutoff === '1';
  } catch (err) {
    console.error("Error parsing form data:", err);
    return res.status(400).json({ error: "Invalid form data" });
  }
  
  // Get uploaded image files
  const uploadedImages = req.files || [];
  const imageUrls = uploadedImages.map(file => `/static/images/${file.filename}`);

  try {
    // Validate required fields
    if (!checklist_data || !user_id || !store_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user_name = checklist_data.user_name || "Χρήστης";
    const store_name = checklist_data.store_name || "Κατάστημα";
    const date = checklist_data.date || new Date().toLocaleDateString('el-GR');
    const time = checklist_data.time || new Date().toLocaleTimeString('el-GR');
    const comments = checklist_data.comments || '';
    const responses = checklist_data.responses || {};

    // Format date and time for filename
    const now = new Date();
    const formattedDate = now.toLocaleDateString('el-GR').replaceAll("/", ".");
    const formattedTime = now.toLocaleTimeString('el-GR').replaceAll(":", ".");

    // Create filename and paths - use only ASCII characters for the filename
    // Replace Greek characters with Latin equivalents and remove any special characters
    const safeUserName = user_name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeStoreName = store_name.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeUserName}_${safeStoreName}_${formattedDate}_${formattedTime}.pdf`;
    const filepath = path.join(__dirname, '..', 'static', 'pdfs', filename);
    const pdf_url = `/static/pdfs/${filename}`;

    // Ensure pdfs directory exists
    if (!fs.existsSync(path.join(__dirname, '..', 'static', 'pdfs'))) {
      fs.mkdirSync(path.join(__dirname, '..', 'static', 'pdfs'), { recursive: true });
    }

    // Create PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filepath));
    
    // Set font for Greek characters
    const fontPath = path.join(__dirname, '../fonts/DejaVuSans.ttf');
    doc.registerFont('GreekFont', fontPath);
    doc.font('GreekFont');

    // PDF Header with blue background
    doc.rect(50, 50, doc.page.width - 100, 40).fill('#007BFF');
    doc.fillColor('white').fontSize(20).text('Checklist Αναφορά', 50, 60, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor('black');
    doc.moveDown(2);
    
    // User and Store Information in a light gray box
    const infoBoxY = doc.y;
    doc.rect(50, infoBoxY, doc.page.width - 100, 100).fill('#f5f5f5');
    doc.fillColor('#333333');
    
    // Add some padding inside the box
    doc.fontSize(12).text(`Όνομα: ${user_name}`, 60, infoBoxY + 10);
    doc.text(`Κατάστημα: ${store_name}`, 60);
    doc.text(`Ημερομηνία: ${date}`, 60);
    doc.text(`Ώρα: ${time}`, 60);
    
    // Score with color based on value
    const scoreValue = parseFloat(total_score);
    let scoreColor = '#28a745'; // Green for good scores
    
    if (scoreValue < 50) {
      scoreColor = '#dc3545'; // Red for poor scores
    } else if (scoreValue < 75) {
      scoreColor = '#ffc107'; // Yellow for average scores
    }
    
    doc.fillColor(scoreColor).text(`Σκορ: ${scoreValue.toFixed(2)}`, 60);
    
    if (has_zero_cutoff) {
      doc.fillColor('red').text(`ΜΗΔΕΝΙΣΤΗΚΕ ΛΟΓΩ ΚΑΤΗΓΟΡΙΑΣ CUTOFF`, 60);
    }
    
    doc.fillColor('black');
    doc.moveDown(2);

    // Responses header
    doc.fontSize(16).fillColor('#007BFF').text('Απαντήσεις:', { underline: true });
    doc.fillColor('black');
    
    // Fetch template to get category and subcategory names
    const [templateRows] = await pool.query(
      "SELECT template_data FROM checklist_templates WHERE role = 'area_manager' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (templateRows.length > 0) {
      const template = typeof templateRows[0].template_data === "string"
        ? JSON.parse(templateRows[0].template_data)
        : templateRows[0].template_data;
      
      // Group responses by category
      const responsesByCategory = {};
      
      Object.entries(responses).forEach(([categoryIdx, categoryResponses]) => {
        if (!responsesByCategory[categoryIdx]) {
          responsesByCategory[categoryIdx] = categoryResponses;
        }
      });
      
      // Format responses for display with actual category and subcategory names
      Object.entries(responsesByCategory).forEach(([categoryIdx, categoryResponses]) => {
        const categoryName = template[categoryIdx]?.name || `Κατηγορία ${categoryIdx}`;
        
        // Draw a colored box for each category
        const categoryBoxY = doc.y;
        const boxHeight = 20 + (Object.keys(categoryResponses).length * 20); // Estimate height based on number of subcategories
        
        // Category header with blue background
        doc.rect(50, categoryBoxY, doc.page.width - 100, 25).fill('#007BFF');
        doc.fillColor('white').fontSize(14).text(categoryName, 60, categoryBoxY + 5, { width: doc.page.width - 120 });
        
        // Light background for subcategories
        doc.rect(50, categoryBoxY + 25, doc.page.width - 100, boxHeight).fill('#f8f9fa');
        doc.fillColor('black').fontSize(12);
        
        // Print all subcategories under this category
        let yOffset = categoryBoxY + 30;
        Object.entries(categoryResponses).forEach(([itemIdx, value]) => {
          const subcategory = template[categoryIdx]?.subcategories?.[itemIdx] || {};
          const subcategoryName = subcategory.name || `Ερώτηση ${itemIdx}`;
          const hasCutoff = subcategory.has_cutoff;
          
          // Color-code the score value
          let valueColor = '#000000'; // Default black
          const numValue = parseInt(value);
          
          if (numValue <= 1) {
            valueColor = '#dc3545'; // Red for poor scores (0-1)
          } else if (numValue === 2) {
            valueColor = '#ffc107'; // Yellow for average scores (2)
          } else if (numValue >= 3) {
            valueColor = '#28a745'; // Green for good scores (3-4)
          }
          
          // Print subcategory name
          if (hasCutoff) {
            doc.fillColor('#dc3545').text(`    ${subcategoryName} (cutoff)`, 60, yOffset);
          } else {
            doc.fillColor('#333333').text(`    ${subcategoryName}`, 60, yOffset);
          }
          
          // Print score value with color
          doc.fillColor(valueColor).text(`: ${value}`, 350, yOffset);
          
          yOffset += 20;
        });
        
        doc.fillColor('black');
        doc.moveDown(2);
      });
    } else {
      // Fallback if template not found
      const responsesByCategory = {};
      
      Object.entries(responses).forEach(([categoryIdx, categoryResponses]) => {
        if (!responsesByCategory[categoryIdx]) {
          responsesByCategory[categoryIdx] = categoryResponses;
        }
      });
      
      Object.entries(responsesByCategory).forEach(([categoryIdx, categoryResponses]) => {
        doc.fontSize(13).text(`Κατηγορία ${categoryIdx}`, { underline: true });
        doc.fontSize(12);
        
        Object.entries(categoryResponses).forEach(([itemIdx, value]) => {
          doc.text(`    Ερώτηση ${itemIdx}: ${value}`);
        });
        
        doc.moveDown();
      });
    }

    doc.moveDown();
    
    // Comments section with light yellow background
    const commentsBoxY = doc.y;
    doc.rect(50, commentsBoxY, doc.page.width - 100, 100).fill('#fff9e6');
    
    // Comments header
    doc.rect(50, commentsBoxY, doc.page.width - 100, 25).fill('#ffc107');
    doc.fillColor('white').fontSize(14).text('Σχόλια:', 60, commentsBoxY + 5);
    
    // Comments content
    doc.fillColor('#333333').fontSize(12).text(comments || '—', 60, commentsBoxY + 35, { 
      width: doc.page.width - 120,
      height: 60,
      ellipsis: true
    });
    
    // Add images section if there are uploaded images
    if (imageUrls.length > 0) {
      doc.addPage();
      
      // Images header with blue background
      doc.rect(50, 50, doc.page.width - 100, 40).fill('#007BFF');
      doc.fillColor('white').fontSize(20).text('Φωτογραφίες', 50, 60, { align: 'center', width: doc.page.width - 100 });
      doc.fillColor('black');
      doc.moveDown(2);
      
      // Add each image to the PDF - one image per row for better visibility on mobile
      let yPosition = doc.y;
      const imageWidth = doc.page.width - 100; // Wider images (full width minus margins)
      const imageHeight = 300; // Taller images
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const imageFilePath = path.join(__dirname, '..', imageUrl.substring(1)); // Remove leading slash
        
        // Calculate position - centered on page
        const xPosition = 50; // Left margin
        
        // Add a new page if needed
        if (yPosition + imageHeight + 40 > doc.page.height - 50) {
          doc.addPage();
          yPosition = 50;
        }
        
        try {
          // Add image to PDF
          doc.image(imageFilePath, xPosition, yPosition, {
            fit: [imageWidth, imageHeight],
            align: 'center',
            valign: 'center'
          });
          
          // Add caption
          const captionY = yPosition + imageHeight + 5;
          doc.fontSize(10).text(`Εικόνα ${i + 1}`, xPosition, captionY, {
            width: imageWidth,
            align: 'center'
          });
        } catch (err) {
          console.error(`Error adding image to PDF: ${err.message}`);
          // Add error text instead of image
          doc.fontSize(12).fillColor('red').text(`[Σφάλμα φόρτωσης εικόνας ${i + 1}]`, xPosition, yPosition);
          doc.fillColor('black');
        }
        
        // Move down after each image
        doc.moveDown(imageHeight / 20 + 2);
        yPosition = doc.y + 20; // Add some extra space between images
      }
    }
    
    // Store image URLs in checklist data
    checklist_data.image_urls = imageUrls;
    
    doc.end();

    // Save to database
    await pool.query(
      `INSERT INTO checklists (store_id, user_id, checklist_data, total_score, has_zero_cutoff, pdf_url, submit_date) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [store_id, user_id, JSON.stringify(checklist_data), parseFloat(total_score).toFixed(2), has_zero_cutoff ? 1 : 0, pdf_url]
    );

    res.status(201).json({ message: "Checklist submitted successfully" });
  } catch (err) {
    console.error("Error submitting checklist:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
