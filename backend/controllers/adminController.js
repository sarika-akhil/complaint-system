const Admin = require('../models/adminModel');
const Complaint = require('../models/complaintModel');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findByUsername(username);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Support both bcrypt and plain text (for initial setup convenience)
    let isValid = false;
    if (admin.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, admin.password);
    } else {
      isValid = (admin.password === password);
    }

    if (isValid) {
      res.json({ 
        success: true, 
        adminId: admin.id, 
        departmentId: admin.department_id, 
        departmentName: admin.department_name || 'Main Admin'
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.getComplaints = async (req, res) => {
  const { departmentId } = req.query;
  try {
    let complaints;
    if (departmentId === 'null' || !departmentId) {
      complaints = await Complaint.findAll();
    } else {
      complaints = await Complaint.findByDepartment(departmentId);
    }
    res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

exports.updateStatus = async (req, res) => {
  const { id, status } = req.body;
  try {
    await Complaint.updateStatus(id, status);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

exports.reassign = async (req, res) => {
  const { id, departmentId } = req.body;
  try {
    await Complaint.reassign(id, departmentId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to reassign' });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Admin.getAllDepartments();
    res.json({ success: true, departments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

exports.resetPasswordRecovery = async (req, res) => {
  const { username, recoveryCode, newPassword } = req.body;
  if (!username || !recoveryCode || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const db = require('../config/db');
  try {
    const admin = await Admin.findByUsername(username);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    if (!admin.recovery_code || admin.recovery_code !== recoveryCode) {
      return res.status(400).json({ success: false, message: 'Invalid recovery code.' });
    }

    // Hash the new password securely
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hashedPassword, admin.id]);

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Recovery Reset Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
};

exports.createBranchAdmin = async (req, res) => {
  const { 
    branchCategory, 
    branchLocation, 
    branchLat, 
    branchLon, 
    adminUsername, 
    adminPassword, 
    adminRecoveryCode 
  } = req.body;

  if (!branchCategory || !branchLocation || !branchLat || !branchLon || !adminUsername || !adminPassword || !adminRecoveryCode) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const db = require('../config/db');
  try {
    // 1. Create the new department branch
    const [deptResult] = await db.execute(
      'INSERT INTO departments (name, location, latitude, longitude) VALUES (?, ?, ?, ?)',
      [branchCategory, branchLocation, branchLat, branchLon]
    );

    // 2. Hash password and insert the new admin linked to this department
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.execute(
      'INSERT INTO admin_users (department_id, username, password, recovery_code) VALUES (?, ?, ?, ?)',
      [deptResult.insertId, adminUsername, hashedPassword, adminRecoveryCode]
    );

    res.json({ success: true, message: 'New branch and administrator created successfully.' });
  } catch (error) {
    console.error('Create Branch/Admin Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Username already exists.' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create branch and admin.' });
    }
  }
};
