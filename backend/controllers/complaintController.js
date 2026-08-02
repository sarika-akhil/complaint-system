const Complaint = require('../models/complaintModel');
const AIService = require('../services/aiService');
const MapService = require('../services/mapService');
const NotificationService = require('../services/notificationService');
const Admin = require('../models/adminModel');

exports.submit = async (req, res) => {
  const { userId, description, latitude, longitude } = req.body;
  const imagePath = req.file ? `uploads/${req.file.filename}` : null;

  // Validate required fields
  if (!userId || !description || !latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    // 0. Verify userId still exists in DB (catches stale localStorage sessions)
    const db = require('../config/db');
    const [userCheck] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      return res.status(401).json({ success: false, message: 'SESSION_EXPIRED' });
    }

    // 1. AI Classification
    const category = await AIService.classifyComplaint(description);
    
    // 2. Map category to department ID
    const departments = await Admin.getAllDepartments();
    const targetDept = departments.find(d => d.name === category) || departments[3]; // Default to Municipal
    const departmentId = targetDept.id;

    // 3. Find Nearest Authority (Prioritize local results via Google Maps)
    const googleNearest = await MapService.findNearestAuthority(latitude, longitude, category);
    const dbNearest = await MapService.findNearestDeptFromDB(latitude, longitude, category);

    const nearest = googleNearest ? {
      name: googleNearest.name,
      lat: googleNearest.lat,
      lon: googleNearest.lon,
      distance: MapService.calculateDistance(latitude, longitude, googleNearest.lat, googleNearest.lon).toFixed(2)
    } : dbNearest;

    // 4. Save Complaint (Single optimized call)
    const complaintId = await Complaint.create({
      userId,
      description,
      imagePath,
      lat: latitude,
      lon: longitude,
      category,
      departmentId,
      nearestStation: nearest
    });

    const navLink = nearest 
      ? MapService.getNavigationLink(latitude, longitude, nearest.lat, nearest.lon)
      : `https://www.openstreetmap.org/directions?to=${latitude},${longitude}`;

    // 5. Send Notification
    const alertPayload = {
      title: `Emergency Alert: ${category}`,
      body: `New incident reported. Location: ${latitude}, ${longitude}. Description: ${description}`,
      locationLink: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
      navLink: navLink,
      proximity: nearest ? `${nearest.distance} km` : 'N/A',
      stationName: nearest ? nearest.name : 'Unknown'
    };

    await NotificationService.sendAlert(`dept_${departmentId}`, alertPayload);
    await NotificationService.sendAlert(`main_admin`, alertPayload);

    res.json({ 
      success: true, 
      complaintId, 
      category, 
      department: targetDept.name,
      nearest: nearest 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to submit complaint' });
  }
};

exports.getByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await require('../config/db').execute(
      `SELECT c.*, d.name as department_name, 
              COALESCE(c.nearest_station_name, d.location) as dept_address, 
              COALESCE(c.nearest_station_lat, d.latitude) as dept_lat, 
              COALESCE(c.nearest_station_lon, d.longitude) as dept_lon 
       FROM complaints c 
       LEFT JOIN departments d ON c.department_id = d.id 
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json({ success: true, complaints: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
