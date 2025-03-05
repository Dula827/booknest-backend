const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const wishlistRoutes = require('./routes/wishlist');
const lendingRoutes = require('./routes/lending');
const bulkUploadRoutes = require('./routes/bulk-upload');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'default-development-key';
  }
});
app.use(limiter);

// Create uploads directory if it doesn't exist
const uploadPath = path.join(__dirname, '..', process.env.UPLOAD_PATH);
if (!require('fs').existsSync(uploadPath)) {
  require('fs').mkdirSync(uploadPath, { recursive: true });
}

// Static files
app.use('/uploads', express.static(uploadPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/lending', lendingRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;