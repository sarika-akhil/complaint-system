// API Base Configuration - Auto-detect port 5000
const API_BASE = 'http://localhost:5000';

// Debug: Log API calls
const makeAPI = async (endpoint, options = {}) => {
  try {
    console.log(`API Request: ${API_BASE}${endpoint}`, options);
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    console.log('API Response:', response.status, response.statusText);
    return response;
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error.message);
    throw new Error('Backend Connection Failed: Is the server running on port 5000?');
  }
};

// OTP flow state
let confirmationResult = null; // true when OTP has been sent, null when not yet
let userCoords = null;


function setMessage(element, text, variant = '') {
  element.innerText = text;
  element.className = variant ? `form-message ${variant}` : 'form-message';
}

// Admin Login Handler
document.getElementById('adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  const msg = document.getElementById('adminMsg');
  msg.className = 'form-message';

  try {
    const response = await makeAPI('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('adminId', data.adminId);
      localStorage.setItem('adminDeptId', data.departmentId);
      localStorage.setItem('adminDeptName', data.departmentName);

      const routes = {
        'Police': 'police-admin.html',
        'Medical': 'medical-admin.html',
        'Fire': 'fire-admin.html',
        'Municipal': 'municipal-admin.html'
      };
      window.location.href = routes[data.departmentName] || 'main-admin.html';
    } else {
      setMessage(msg, 'Invalid authority credentials', 'error');
    }
  } catch (error) {
    setMessage(msg, 'Login connection failed', 'error');
  }
});



document.getElementById('citizenForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const otp = document.getElementById('otp').value;
  const otpSection = document.getElementById('otp-section');
  const submitBtn = document.querySelector('#citizenForm .submit-btn');
  const msg = document.getElementById('msg');

  setMessage(msg, '');

  const testUsers = ['+919876543210', '+919876543211', '+919876543212'];
  const isTestUser = testUsers.includes(phone);

  if (!confirmationResult) {
    try {
      setMessage(msg, 'Requesting location permission...');
      submitBtn.disabled = true;

      try {
        userCoords = await LocationService.getCurrentLocation(true);
      } catch (locError) {
        submitBtn.disabled = false;
        if (locError.code === 'PERMISSION_DENIED') {
          setMessage(msg, 'Location permission denied. Please enable location access to continue.', 'error');
        } else {
          setMessage(msg, `Location Error: ${locError.message}`, 'error');
        }
        return;
      }

      if (isTestUser) {
        setMessage(msg, 'Logging in (test user)...');

        const response = await makeAPI('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            email,
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
          setMessage(msg, 'Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'citizen-home.html';
          }, 1000);
        } else {
          setMessage(msg, data.message || 'Login failed', 'error');
        }
        return;
      }

      setMessage(msg, 'Sending OTP to email...');
      const response = await makeAPI('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email })
      });

      const data = await response.json();
      submitBtn.disabled = false;

      if (!data.success) {
        throw new Error(data.message);
      }

      otpSection.style.display = 'block';
      submitBtn.innerText = 'Verify OTP';
      confirmationResult = true;
      setMessage(msg, 'OTP sent to your email! (Valid for 5 mins)', 'success');
    } catch (error) {
      submitBtn.disabled = false;
      setMessage(msg, `Error: ${error.message}`, 'error');
    }
    return;
  }

  try {
    if (!otp) {
      throw new Error('Please enter the OTP');
    }

    setMessage(msg, 'Verifying OTP...');
    submitBtn.disabled = true;

    if (!userCoords) {
      throw new Error('Location data missing. Please try again.');
    }

    const response = await makeAPI('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        phone,
        email,
        otp,
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
      setMessage(msg, 'Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'citizen-home.html';
      }, 1000);
    } else {
      setMessage(msg, data.message || 'Invalid OTP', 'error');
    }
  } catch (error) {
    submitBtn.disabled = false;
    setMessage(msg, `Error: ${error.message}`, 'error');
  }
});

// Admin Password Recovery Form Submission
document.getElementById('recoveryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('recoveryUsername').value;
  const recoveryCode = document.getElementById('recoveryCode').value.trim();
  const newPassword = document.getElementById('recoveryNewPassword').value;
  const msg = document.getElementById('recoveryMsg');
  const submitBtn = e.target.querySelector('.submit-btn');

  setMessage(msg, '');
  submitBtn.disabled = true;

  try {
    const response = await makeAPI('/api/admin/reset-password-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, recoveryCode, newPassword })
    });

    const data = await response.json();
    submitBtn.disabled = false;

    if (data.success) {
      setMessage(msg, 'Password reset successful! Redirecting to Sign In...', 'success');
      setTimeout(() => {
        showAdminLogin();
        // Clear recovery form inputs
        e.target.reset();
        setMessage(msg, '');
      }, 2500);
    } else {
      setMessage(msg, data.message || 'Verification failed.', 'error');
    }
  } catch (error) {
    submitBtn.disabled = false;
    setMessage(msg, 'Connection failed. Please try again.', 'error');
  }
});
