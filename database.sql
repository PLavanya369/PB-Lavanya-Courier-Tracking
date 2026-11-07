CREATE DATABASE IF NOT EXISTS lavanya_courier;
USE lavanya_courier;

CREATE TABLE IF NOT EXISTS Customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Parcels (
  parcel_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  sender_address VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(15) NOT NULL,
  receiver_address VARCHAR(255) NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  booking_date DATE NOT NULL,
  Status VARCHAR(30) NOT NULL DEFAULT 'Booked',
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

CREATE TABLE IF NOT EXISTS Tracking (
  tracking_id INT AUTO_INCREMENT PRIMARY KEY,
  Parcel_id INT NOT NULL,
  current_location VARCHAR(150) NOT NULL,
  tracking_status VARCHAR(50) NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  remarks VARCHAR(255),
  FOREIGN KEY (Parcel_id) REFERENCES Parcels(parcel_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Admins (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

-- Demo admin is created automatically by the server on first start:
-- username: admin | password: Admin@123
