// API Base Configuration - Auto-detect port 5000
const API_BASE = 'http://localhost:5000';

// Debug: Log API calls
const makeAPI = async (endpoint, options = {}) => {
  try {
    console.log(`API Request: ${API_BASE}${endpoint}`, options);
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    console.log(`API Response:`, response.status, response.statusText);
    return response;
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error.message);
    throw new Error(`Backend Connection Failed: Is the server running on port 5000?`);
  }
};

// Firebase Configuration Hub
const firebaseConfig = {
  // USER: Add your Firebase config here
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase if not already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
let confirmationResult = null;
let userCoords = null; // Store location for reuse

function showTab(type) {
  const citizenForm = document.getElementById('citizenForm');
  const adminForm = document.getElementById('adminForm');
  const tabs = document.querySelectorAll('.form-tabs button');

  document.getElementById('msg').innerText = '';
  if (type === 'citizen') {
    citizenForm.classList.add('active');
    adminForm.classList.remove('active');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
  } else {
    citizenForm.classList.remove('active');
    adminForm.classList.add('active');
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');
  }
}

// Admin Login Handler
document.getElementById('adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  const msg = document.getElementById('adminMsg');
  msg.className = 'form-message';

  try {
    const response = await makeAPI(`/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('adminId', data.adminId);
      localStorage.setItem('adminDeptId', data.departmentId);
      
      // Route based on department
      const routes = {
        1: 'police-admin.html',
        2: 'medical-admin.html',
        3: 'fire-admin.html',
        4: 'municipal-admin.html'
      };
      window.location.href = routes[data.departmentId] || 'main-admin.html';
    } else {
      msg.innerText = "Invalid authority credentials";
      msg.className = 'form-message error';
    }
  } catch (error) {
    msg.innerText = "Login connection failed";
    msg.className = 'form-message error';
  }
});

// Global export for HTML
window.showTab = showTab;

document.getElementById('citizenForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const otpSection = document.getElementById('otp-section');
  const submitBtn = document.querySelector('#citizenForm .submit-btn');
  const msg = document.getElementById('msg');
  msg.innerText = '';
  msg.className = 'form-message';

  // TEST MODE: Check if this is a test user (skip OTP)
  const testUsers = ['+919876543210', '+919876543211', '+919876543212'];
  const isTestUser = testUsers.includes(phone);

  if (!confirmationResult) {
    // Stage 1: Request Location Permission
    try {
      msg.innerText = "Requesting location permission...";
      msg.className = 'form-message';
      submitBtn.disabled = true;

      // Get location
      let coords;
      try {
        coords = await LocationService.getCurrentLocation(true);
        userCoords = coords;
      } catch (locError) {
        submitBtn.disabled = false;
        if (locError.code === 'PERMISSION_DENIED') {
          msg.innerText = "❌ Location permission denied. Please enable location access to continue.";
        } else {
          msg.innerText = "⚠️ Location Error: " + locError.message;
        }
        msg.className = 'form-message error';
        return;
      }

      // For test users, skip OTP and go directly to login
      if (isTestUser) {
        msg.innerText = "Logging in (Test User - OTP Skipped)...";
        msg.className = 'form-message';
        
        try {
          const response = await makeAPI(`/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: phone,
              email: email,
              latitude: userCoords.lat,
              longitude: userCoords.lon
            })
          });
          
          const data = await response.json();
          submitBtn.disabled = false;
          
          if (data.success) {
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', username);
            localStorage.setItem('phone', phone);
            localStorage.setItem('email', email);
            msg.innerText = "✓ Login successful! Redirecting...";
            msg.className = 'form-message success';
            setTimeout(() => {
              window.location.href = 'citizen-home.html';
            }, 1000);
          } else {
            msg.innerText = data.message || "Login failed";
            msg.className = 'form-message error';
          }
        } catch (error) {
          submitBtn.disabled = false;
          msg.innerText = "Error: " + error.message;
          msg.className = 'form-message error';
        }
      } else {
        // Regular user flow - send OTP
        msg.innerText = "Sending OTP to email...";
        msg.className = 'form-message';

        const response = await makeAPI(`/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, email })
        });
        
        const data = await response.json();
        submitBtn.disabled = false;
        
        if (!data.success) throw new Error(data.message);

        otpSection.style.display = 'block';
        submitBtn.innerText = 'Verify OTP';
        confirmationResult = true;
        msg.innerText = "✓ OTP sent to your email! (Valid for 5 mins)";
        msg.className = 'form-message success';
      }
    } catch (error) {
      submitBtn.disabled = false;
      msg.innerText = "Error: " + error.message;
      msg.className = 'form-message error';
    }
  } else {
    // Stage 2: Verify OTP and Login Backend
    const otp = document.getElementById('otp').value;
      msg.innerText = "✓ OTP sent to your email! (Valid for 5 mins)";
      msg.className = 'form-message success';
    } catch (error) {
      submitBtn.disabled = false;
      msg.innerText = "Error: " + error.message;
      msg.className = 'form-message error';
    }
  } else {
    // Stage 2: Verify OTP and Login Backend
    const otp = document.getElementById('otp').value;
    try {
      if(!otp) throw new Error("Please enter the OTP");

      msg.innerText = "Verifying OTP...";
      msg.className = 'form-message';
      submitBtn.disabled = true;

      // Use saved location from Stage 1
      if (!userCoords) {
        throw new Error("Location data missing. Please try again.");
      }
      
      const response = await makeAPI(`/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          phone: phone,
          email: email,
          otp: otp,
          latitude: userCoords.lat,
          longitude: userCoords.lon
        })
      });
      
      const data = await response.json();
      submitBtn.disabled = false;
      
      if (data.success) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', username);
        localStorage.setItem('phone', phone);
        localStorage.setItem('email', email);
        msg.innerText = "✓ Login successful! Redirecting...";
        msg.className = 'form-message success';
        setTimeout(() => {
          window.location.href = 'citizen-home.html';
        }, 1000);
      } else {
        msg.innerText = data.message || "Invalid OTP";
        msg.className = 'form-message error';
      }
    } catch (error) {
      submitBtn.disabled = false;
      msg.innerText = "Error: " + error.message;
      msg.className = 'form-message error';
    }
  }
});
