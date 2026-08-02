let map, marker;
let currentCoords = null;
const API_BASE = 'https://smartcomplaint-system-api.onrender.com';

// Initialize Map
async function initMap() {
  const statusEl = document.getElementById('locationStatus');
  statusEl.innerText = "Synchronizing with your GPS...";

  try {
    const coords = await LocationService.getCurrentLocation(true); // Always try for high accuracy first
    currentCoords = coords;
    
    if (map) {
      map.setView([coords.lat, coords.lon], 16);
      marker.setLatLng([coords.lat, coords.lon]);
    } else {
      map = L.map('map').setView([coords.lat, coords.lon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      marker = L.marker([coords.lat, coords.lon], { draggable: true }).addTo(map);
    }

    statusEl.innerText = `Incident Spot (Verified): ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;

    marker.on('dragend', function(event) {
      const position = marker.getLatLng();
      currentCoords = { lat: position.lat, lon: position.lng };
      statusEl.innerText = `Incident Spot (Pinned): ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
    });
  } catch (error) {
    statusEl.innerHTML = `<span style="color: #ff4d4d;">⚠️ Location Error: Please allow GPS access in your browser to report accurately.</span>`;
    console.error("Map Init Error:", error);
  }
}

// Handle image preview
document.getElementById('image').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const previewImg = document.getElementById('previewImg');
      previewImg.src = e.target.result;
      document.getElementById('imagePreview').style.display = 'block';
    }
    reader.readAsDataURL(file);
  }
});

document.getElementById('submitBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  const description = document.getElementById('description').value;
  
  // HTML form validation check
  if (!document.getElementById('reportForm').checkValidity()) {
    document.getElementById('reportForm').reportValidity();
    return;
  }
  const imageFile = document.getElementById('image').files[0];
  const userId = localStorage.getItem('userId');

  if (!userId) {
    alert("Please login first");
    window.location.href = 'login.html';
    return;
  }

  if (!currentCoords) {
    alert("Please wait for location to load");
    return;
  }

  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('description', description);
  formData.append('latitude', currentCoords.lat);
  formData.append('longitude', currentCoords.lon);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const response = await fetch(`${API_BASE}/api/complaints/submit`, {
      method: 'POST',
      body: formData // No Content-Type header needed; browser sets it automatically with FormData
    });

    const data = await response.json();
    if (data.success) {
      const station = data.nearest ? data.nearest.name : 'Unknown';
      const distance = data.nearest && data.nearest.distance ? `${data.nearest.distance} km` : 'N/A';
      const catDisplay = data.category || 'Incident';
      
      // Update Main Message
      document.getElementById('successMainMessage').innerText = `Your report was submitted through near ${catDisplay} station`;

      // USER REQUESTED FORMAT: fighting : police
      document.getElementById('successDesc').innerText = `${description} : ${catDisplay}`;
      document.getElementById('successStationTitle').innerText = `Nearest ${catDisplay} Station`;
      document.getElementById('successStationName').innerText = station;
      document.getElementById('successDistance').innerText = distance;
      
      document.getElementById('successModal').style.display = 'flex';
    } else if (data.message === 'SESSION_EXPIRED') {
      // Stale localStorage — clear session and redirect to login
      localStorage.clear();
      alert('Your session has expired. Please log in again.');
      window.location.href = 'login.html';
    } else {
      alert('Submission failed: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error(error);
    alert('Network error — make sure the server is running.');
  }
});

let issuesMap, dummyMarkers = [];

function showIssuesMap() {
    const modal = document.getElementById('issuesModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    const baseCoords = currentCoords || { lat: 16.5062, lon: 80.6480 }; // Fallback to Vijayawada

    // Initialize map if not exists
    if (!issuesMap) {
        const dummyMapEl = document.getElementById('dummyMap');
        if (dummyMapEl) {
            issuesMap = L.map('dummyMap').setView([baseCoords.lat, baseCoords.lon], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(issuesMap);
        }
    } else {
        issuesMap.setView([baseCoords.lat, baseCoords.lon], 14);
        // Clear old markers
        dummyMarkers.forEach(m => issuesMap.removeLayer(m));
        dummyMarkers = [];
    }

    if (!issuesMap) return;

    // Dummy Data Generation
    const dummyData = [
        { lat: baseCoords.lat + 0.005, lon: baseCoords.lon + 0.002, cat: 'Police', desc: '🚨 Minor Road Accident - Area Congested', color: '#4f46e5', icon: '🚨' },
        { lat: baseCoords.lat - 0.003, lon: baseCoords.lon + 0.008, cat: 'Fire', desc: '🔥 Small Fire Reported - Units En Route', color: '#dc2626', icon: '🔥' },
        { lat: baseCoords.lat + 0.002, lon: baseCoords.lon - 0.005, cat: 'Municipal', desc: '💧 Major Water Pipe Leakage', color: '#7c3aed', icon: '💧' },
        { lat: baseCoords.lat - 0.006, lon: baseCoords.lon - 0.002, cat: 'Medical', desc: '🚑 Medical Emergency - Ambulance Dispatched', color: '#059669', icon: '🚑' }
    ];

    dummyData.forEach(item => {
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${item.color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${item.icon}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const marker = L.marker([item.lat, item.lon], { icon: icon }).addTo(issuesMap)
        .bindPopup(`<strong style="font-weight: 800; color: ${item.color}">${item.cat}</strong><br><span style="font-weight: 600;">${item.desc}</span>`);
        
        dummyMarkers.push(marker);
    });

    // Invalidate size to fix gray box issues in modals
    setTimeout(() => issuesMap.invalidateSize(), 200);
}

function closeIssuesModal() {
    const modal = document.getElementById('issuesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Global exports
window.showIssuesMap = showIssuesMap;
window.closeIssuesModal = closeIssuesModal;

initMap();
