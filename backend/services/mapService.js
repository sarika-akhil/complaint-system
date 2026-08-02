const axios = require('axios');
require('dotenv').config();

class MapService {
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  static async findNearestDeptFromDB(userLat, userLon, categoryName) {
    const db = require('../config/db');
    try {
      // Find all offices for this category (e.g., 'Police')
      const [depts] = await db.execute(
        'SELECT id, name, location, latitude, longitude FROM departments WHERE name = ?',
        [categoryName]
      );

      let nearest = null;
      let minDistance = Infinity;

      depts.forEach(dept => {
        if (dept.latitude && dept.longitude) {
          const dist = this.calculateDistance(userLat, userLon, dept.latitude, dept.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = { id: dept.id, name: dept.location, lat: dept.latitude, lon: dept.longitude, distance: dist.toFixed(2) };
          }
        }
      });

      return nearest;
    } catch (error) {
      console.error("DB Proximity Error:", error);
      return null;
    }
  }

  /**
   * Find nearest authority using OpenStreetMap Nominatim (free, no API key needed).
   * Uses the Overpass API to search for nearby amenities.
   */
  static async findNearestAuthority(lat, lon, department) {
    const amenityMapping = {
      'Police': 'police',
      'Medical': 'hospital',
      'Fire': 'fire_station',
      'Municipal': 'townhall'
    };

    const amenity = amenityMapping[department] || 'government';

    // Overpass API query: find nearest amenity within 5km
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["amenity"="${amenity}"](around:5000,${lat},${lon});
        way["amenity"="${amenity}"](around:5000,${lat},${lon});
      );
      out center 1;
    `;

    try {
      const response = await axios.post(
        'https://overpass-api.de/api/interpreter',
        overpassQuery,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 12000
        }
      );

      const elements = response.data.elements;
      if (elements && elements.length > 0) {
        const place = elements[0];
        const placeLat = place.lat || place.center?.lat;
        const placeLon = place.lon || place.center?.lon;
        const placeName = place.tags?.name || `Nearest ${department} Station`;

        if (placeLat && placeLon) {
          return {
            name: placeName,
            lat: placeLat,
            lon: placeLon
          };
        }
      }
      return null;
    } catch (error) {
      // Overpass may be slow/unavailable - silently fall back to DB
      console.warn(`Overpass API unavailable for ${department} lookup, using DB fallback.`);
      return null;
    }
  }

  static getNavigationLink(startLat, startLon, destLat, destLon) {
    // Return complete routing path from incident (start) to station (destination) using OpenStreetMap (URL Encoded)
    return `https://www.openstreetmap.org/directions?route=${startLat}%2C${startLon}%3B${destLat}%2C${destLon}`;
  }
}

module.exports = MapService;
