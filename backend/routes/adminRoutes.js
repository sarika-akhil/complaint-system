const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/login', adminController.login);
router.get('/complaints', adminController.getComplaints);
router.post('/update-status', adminController.updateStatus);
router.post('/reassign', adminController.reassign);
router.get('/departments', adminController.getDepartments);
router.post('/reset-password-recovery', adminController.resetPasswordRecovery);
router.post('/create-branch-admin', adminController.createBranchAdmin);

module.exports = router;
