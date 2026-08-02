-- AI-Powered Smart Complaint and Emergency Reporting System
-- Database Schema

CREATE DATABASE IF NOT EXISTS smart_complaint_db;
USE smart_complaint_db;

-- Drop existing tables for a clean slate
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

-- Departments table (with Coordinates)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- Users table (Citizens)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    recovery_code VARCHAR(100),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    description TEXT,
    image_path VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    category VARCHAR(50), -- e.g., 'Fire', 'Medical', 'Police', 'Municipal'
    department_id INT,
    status ENUM('Pending', 'In Progress', 'Resolved', 'Reassigned') DEFAULT 'Pending',
    nearest_station_name VARCHAR(255),
    nearest_station_lat DECIMAL(10, 8),
    nearest_station_lon DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Insert initial departments with specific coordinates for routing demo
-- Hyderabad (Headquarters)
INSERT INTO departments (id, name, location, latitude, longitude) VALUES 
(1, 'Police', 'Hyderabad Central Police Head Quarters', 17.4065, 78.4772),
(2, 'Medical', 'Hyderabad City General Hospital', 17.4126, 78.4682),
(3, 'Fire', 'Hyderabad Main Fire Station', 17.4200, 78.4500),
(4, 'Municipal', 'Hyderabad Municipal Corporation Office', 17.4300, 78.4411);

-- Vijayawada (Regional)
INSERT INTO departments (name, location, latitude, longitude) VALUES 
('Police', 'Vijayawada Governorpet Police Station', 16.5126, 80.6277),
('Medical', 'Vijayawada Government General Hospital', 16.5028, 80.6408),
('Fire', 'Vijayawada Fire Station', 16.5150, 80.6300),
('Municipal', 'Vijayawada Municipal Corporation', 16.5111, 80.6341);

-- Insert default admin users (Password: admin123)
INSERT INTO admin_users (department_id, username, password, recovery_code) VALUES 
(1, 'police_admin', 'admin123', 'POLICE-SAFE-123'),
(2, 'medical_admin', 'admin123', 'MEDICAL-SAFE-123'),
(3, 'fire_admin', 'admin123', 'FIRE-SAFE-123'),
(4, 'municipal_admin', 'admin123', 'MUNICIPAL-SAFE-123'),
(NULL, 'main_admin', 'admin123', 'MAIN-SAFE-123');
