// API Base Configuration
const API_BASE = 'http://localhost:5000';

// Session Guard & Role-Based Access Control
(function() {
  const adminId = localStorage.getItem('adminId');
  const adminDeptId = localStorage.getItem('adminDeptId');
  const adminDeptName = localStorage.getItem('adminDeptName');
  const isMainAdmin = !adminDeptId || adminDeptId === 'null';
  const currentPath = window.location.pathname;

  // 1. Authentication Check
  if (!adminId && !currentPath.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  // Detect stale sessions (missing department name metadata for branch admins) and force a logout/refresh
  if (adminId && !isMainAdmin && !adminDeptName) {
    console.warn("[Guard] Stale admin session detected. Clearing storage to refresh metadata.");
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // 2. Authorization Check (Route Guard)
  if (adminId && !isMainAdmin && adminDeptName) {
    const routes = {
      'Police': 'police-admin.html',
      'Medical': 'medical-admin.html',
      'Fire': 'fire-admin.html',
      'Municipal': 'municipal-admin.html'
    };

    const allowedPage = routes[adminDeptName];
    if (allowedPage && !currentPath.includes(allowedPage)) {
      console.warn(`[Guard] Access denied to ${currentPath}. Redirecting to ${allowedPage}.`);
      window.location.href = allowedPage;
      return;
    }
  }

  // 3. Navigation Clean-up (Run after DOM is loaded)
  document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !isMainAdmin && adminDeptName) {
      const links = navLinks.querySelectorAll('a');
      const routes = {
        'Police': 'police-admin.html',
        'Medical': 'medical-admin.html',
        'Fire': 'fire-admin.html',
        'Municipal': 'municipal-admin.html'
      };

      const allowedPage = routes[adminDeptName];

      links.forEach(link => {
        const href = link.getAttribute('href');
        const isAllowed = href && href.includes(allowedPage);
        const isLogout = href && href.includes('logout');

        if (!isAllowed && !isLogout) {
          link.style.display = 'none'; // Hide other departments and main dashboard
        } else if (isAllowed) {
          link.innerText = 'Dashboard'; // Simplify tab name to just "Dashboard"
          link.className = 'active';
        }
      });
    }
  });
})();

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2);
}

async function loadAdminComplaints(deptId = null, targetCategory = null) {
  try {
    const validDeptId = (deptId && deptId !== 'null' && deptId !== 'undefined') ? deptId : null;
    const url = validDeptId ? `${API_BASE}/api/admin/complaints?departmentId=${validDeptId}` : `${API_BASE}/api/admin/complaints`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Define Categories and their IDs
    const categoryMap = {
      'Police': 'policeComplaints',
      'Municipal': 'municipalComplaints',
      'Medical': 'medicalComplaints',
      'Fire': 'fireComplaints'
    };

    let count = 0;

    // Reset containers
    if (targetCategory) {
      const container = document.getElementById('adminComplaints');
      if (container) container.innerHTML = '';
    } else if (!validDeptId) {
      Object.keys(categoryMap).forEach(cat => {
        const id = categoryMap[cat];
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
        const sectionId = id.replace('Complaints', 'Section');
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
      });
    } else {
      const container = document.getElementById('adminComplaints');
      if (container) container.innerHTML = '';
    }

    data.complaints.forEach(c => {
      // Filter out complaints that do not match the target category for single department pages
      if (targetCategory && c.category && c.category.toLowerCase() !== targetCategory.toLowerCase()) {
        return;
      }

      count++;
      const distance = calculateDistance(c.latitude, c.longitude, c.dept_lat, c.dept_lon);
      const card = document.createElement('div');
      card.className = 'complaint-card glass-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <h3 style="font-weight: 800;">${c.category}</h3>
          <span class="status-badge status-${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span>
        </div>
        ${c.image_path ? `<img src="${API_BASE}/${c.image_path}" alt="Complaint Image" style="width: 100%; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid var(--border-light);">` : ''}
        <p style="margin: 1rem 0; color: var(--text-secondary); font-weight: 600;">${c.description}</p>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          <div><strong style="color: var(--text-primary);">Reported by:</strong> ${c.user_phone}</div>
          <div><strong style="color: var(--text-primary);">Location:</strong> ${c.latitude}, ${c.longitude}</div>
          ${distance ? `<div style="color: var(--primary); font-weight: 800; margin-top: 0.5rem; font-size: 0.8rem;">📍 Station: ${c.dept_name || c.department_name} (${distance} km)</div>` : ''}
        </div>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <a href="https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}" target="_blank" class="btn btn-primary" style="font-size: 0.7rem; padding: 0.5rem 1rem;">View Map</a>
          <a href="https://www.openstreetmap.org/directions?route=${c.latitude}%2C${c.longitude}%3B${c.dept_lat}%2C${c.dept_lon}#map=14/${c.latitude}/${c.longitude}" target="_blank" class="btn" style="font-size: 0.7rem; background: var(--secondary); color: white; padding: 0.5rem 1rem;">Navigate</a>
          
          <select onchange="updateStatus(${c.id}, this.value)" style="width: auto; padding: 0.4rem; font-weight: 700; font-size: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-light);">
            <option value="Pending" ${c.status==='Pending'?'selected':''}>Pending</option>
            <option value="In Progress" ${c.status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Resolved" ${c.status==='Resolved'?'selected':''}>Resolved</option>
          </select>
          
          ${!validDeptId ? `<button onclick="showReassign(${c.id})" class="btn" style="font-size: 0.7rem; background: #e2e8f0; color: #475569; padding: 0.5rem 1rem;">Reassign</button>` : ''}
        </div>
      `;

      if (targetCategory || validDeptId) {
        const container = document.getElementById('adminComplaints');
        if (container) container.appendChild(card);
      } else {
        const containerId = categoryMap[c.category] || 'policeComplaints';
        const sectionId = containerId.replace('Complaints', 'Section');
        const container = document.getElementById(containerId);
        const section = document.getElementById(sectionId);
        if (container) container.appendChild(card);
        if (section) section.style.display = 'block';
      }
    });

    if (count === 0) {
      const msg = document.createElement('p');
      msg.style.padding = '2rem';
      msg.style.textAlign = 'center';
      msg.style.color = 'var(--text-dim)';
      msg.innerText = 'No active incidents reported.';
      if (targetCategory || validDeptId) {
         const container = document.getElementById('adminComplaints');
         if (container) container.appendChild(msg);
      } else {
         const pSec = document.getElementById('policeSection');
         if (pSec) pSec.style.display = 'block';
         const pComp = document.getElementById('policeComplaints');
         if (pComp) pComp.appendChild(msg);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function updateStatus(id, status) {
  await fetch(`${API_BASE}/api/admin/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status })
  });
  location.reload();
}

async function showReassign(complaintId) {
  const deptId = prompt("Enter Department ID (1:Police, 2:Medical, 3:Fire, 4:Municipal):");
  if (deptId) {
    await fetch(`${API_BASE}/api/admin/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: complaintId, departmentId: deptId })
    });
    location.reload();
  }
}

function logout() {
  localStorage.removeItem('adminId');
  localStorage.removeItem('adminDeptId');
  window.location.href = 'login.html';
}

// Global Exports
window.logout = logout;
window.updateStatus = updateStatus;
window.showReassign = showReassign;
window.loadAdminComplaints = loadAdminComplaints;
