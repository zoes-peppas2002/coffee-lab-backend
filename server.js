const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

const initDb = require('./init-db');
const usersRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/stores");
const checklistRoutes = require('./routes/checklists');
const templatesRoutes = require('./routes/templates');
const statsRoutes = require('./routes/stats');
const networkRoutes = require('./routes/network');

const app = express();
const PORT = process.env.PORT || 5000;

// Επιλογή του κατάλληλου pool ανάλογα με το περιβάλλον
let pool;
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // Χρήση PostgreSQL στο Render
  pool = require('./db-pg');
  console.log('Using PostgreSQL database');
} else {
  // Χρήση MySQL τοπικά
  pool = require('./db');
  console.log('Using MySQL database');
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Special route for PDF files to handle Greek characters
app.get('/static/pdfs/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'static', 'pdfs', filename);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(filePath).pipe(res);
  } else {
    console.error(`File not found: ${filePath}`);
    res.status(404).send('File not found');
  }
});

// Fallback route for old PDF URLs
app.use('/pdfs/:filename', (req, res) => {
  const filename = req.params.filename;
  res.redirect(`/static/pdfs/${filename}`);
});

// Attach pool to each request (αποφεύγουμε διπλές δηλώσεις)
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/network", networkRoutes);

app.get("/", (req, res) => {
  res.send("✅ Backend API working!");
});

// Initialize database
initDb().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV === 'development';
  console.log(`🚀 Server running on ${isDev ? `http://localhost:${PORT}` : `port ${PORT}`}`);
});
