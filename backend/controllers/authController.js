const User = require('../models/userModel');
const nodemailer = require('nodemailer');

// Temporary in-memory store for OTPs
const otpStore = new Map();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendOtp = async (req, res) => {
    const { phone, email } = req.body;
    if (!phone || !email) return res.status(400).json({ success: false, message: 'Phone and Email are required.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    otpStore.set(email, { otp, phone, expiresAt: Date.now() + 5 * 60 * 1000 }); // Valid for 5 mins

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Login OTP for Smart Complaint System',
        text: `Your One-Time Password (OTP) is: ${otp}. It will expire in 5 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP sent to email.' });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: 'Failed to send OTP email. Please check server configuration.' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, phone, otp, latitude, longitude } = req.body;
    
    const record = otpStore.get(email);
    if (!record || record.otp !== otp || record.phone !== phone) {
        return res.status(400).json({ success: false, message: 'Invalid OTP or incorrect details.' });
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    try {
        // OTP is valid! Log them in.
        const userId = await User.createOrUpdate(phone, email, latitude, longitude);
        otpStore.delete(email); // clear OTP
        res.json({ success: true, userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Login failed due to database error.' });
    }
};

exports.login = async (req, res) => {
  const { phone, email, latitude, longitude } = req.body;
  try {
    const userId = await User.createOrUpdate(phone, email, latitude, longitude);
    res.json({ success: true, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.lookupUser = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required' });
  }
  
  try {
    const [rows] = await require('../config/db').execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (rows.length > 0) {
      res.json({ success: true, userId: rows[0].id });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lookup failed' });
  }
};
