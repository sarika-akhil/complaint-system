const db = require('../config/db');

class Complaint {
  static async create({ userId, description, imagePath, lat, lon, category, departmentId, nearestStation }) {
    const [result] = await db.execute(
      `INSERT INTO complaints (
        user_id, description, image_path, latitude, longitude, category, department_id, 
        nearest_station_name, nearest_station_lat, nearest_station_lon, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        userId, description, imagePath, lat, lon, category, departmentId, 
        nearestStation?.name || null, 
        nearestStation?.lat || null, 
        nearestStation?.lon || null
      ]
    );
    return result.insertId;
  }

  static async findAll() {
    const [rows] = await db.execute(`
      SELECT c.*, u.phone as user_phone, d.name as department_name, 
             COALESCE(c.nearest_station_lat, d.latitude) as dept_lat, 
             COALESCE(c.nearest_station_lon, d.longitude) as dept_lon,
             COALESCE(c.nearest_station_name, d.location) as dept_name
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.created_at DESC
    `);
    return rows;
  }

  static async findByDepartment(departmentId) {
    const [rows] = await db.execute(`
      SELECT c.*, u.phone as user_phone, d.name as department_name,
             COALESCE(c.nearest_station_lat, d.latitude) as dept_lat, 
             COALESCE(c.nearest_station_lon, d.longitude) as dept_lon,
             COALESCE(c.nearest_station_name, d.location) as dept_name
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      JOIN departments d ON c.department_id = d.id
      WHERE c.department_id = ?
      ORDER BY c.created_at DESC
    `, [departmentId]);
    return rows;
  }

  static async updateStatus(id, status) {
    await db.execute('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
  }

  static async reassign(id, departmentId) {
    await db.execute('UPDATE complaints SET department_id = ?, status = "Reassigned" WHERE id = ?', [departmentId, id]);
  }
}

module.exports = Complaint;
