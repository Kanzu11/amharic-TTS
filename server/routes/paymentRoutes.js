const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const paymentController = require('../controllers/paymentController');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const { protect, admin } = require('../middleware/authMiddleware');

// Configure Multer for file storage
const upload = multer({ storage: storage });

router.post('/submit', protect, upload.single('proofImage'), paymentController.submitPayment);
router.get('/my-history', protect, paymentController.getUserPayments);
router.get('/pending', protect, admin, paymentController.getPendingPayments);
router.get('/history', protect, admin, paymentController.getProcessedPayments);
router.put('/:id/approve', protect, admin, paymentController.approvePayment);
router.put('/:id/reject', protect, admin, paymentController.rejectPayment);

module.exports = router;
