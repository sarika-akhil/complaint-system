const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.get('/lookup-user', authController.lookupUser);

// Keep old route for backwards compatibility if needed during transition
router.post('/login', authController.login);

module.exports = router;
