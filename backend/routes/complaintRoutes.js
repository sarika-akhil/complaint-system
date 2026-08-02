const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory always exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/submit', upload.single('image'), complaintController.submit);
router.get('/user/:userId', complaintController.getByUser);

module.exports = router;
