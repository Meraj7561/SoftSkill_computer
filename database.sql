-- =====================================================================
-- SoftSkill Institute - Database Schema
-- Import this file in phpMyAdmin (or `mysql -u root -p < database.sql`)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS softskill_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE softskill_db;

-- ---------------------------------------------------------------------
-- Admins (Admin Panel login)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default admin login -> username: admin | password: Admin@123
-- (change the password immediately after first login from the admin panel)
INSERT INTO admins (username, password, full_name)
VALUES ('admin', '$2b$10$wUyp5.CPYhH/mGvtep71EODNJfNtbYw0jeAHfff4kqU1MGDhnBqk6', 'Administrator')
ON DUPLICATE KEY UPDATE username = username;

-- ---------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(30) NOT NULL,          -- computer | university | programming | english
    course_code VARCHAR(30) DEFAULT NULL,
    course_name VARCHAR(150) NOT NULL,
    duration VARCHAR(50) DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,
    is_featured TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    status TINYINT(1) DEFAULT 1,            -- 1 = active/visible, 0 = hidden
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Seed the courses that already existed on the static site
INSERT INTO courses (category, course_code, course_name, duration, description, is_featured, sort_order) VALUES
('computer', 'COA',  'Certificate in Office Automation (COA)',           '3 Months',  'Master MS Office suite and essential productivity tools', 0, 1),
('computer', 'CFA',  'Certificate in Financial Accounting (CFA)',        '3 Months',  'Learn accounting fundamentals with Tally', 0, 2),
('computer', 'CDP',  'Certificate in Desktop Publishing (CDP)',          '3 Months',  'Design stunning graphics and layouts', 0, 3),
('computer', 'CWD',  'Certificate in Web Designing (CWD)',               '3 Months',  'Build beautiful, responsive websites', 0, 4),
('computer', 'CBH',  'Certificate in Basic Hardware (CBH)',              '3 Months',  'Understand computer hardware and troubleshooting', 0, 5),
('computer', 'CCAD', 'Certificate in Computer Aided Design (CCAD)',      '4 Months',  'Learn AutoCAD and technical drawing', 0, 6),
('computer', 'DCA',  'Diploma in Computer Application (DCA)',           '6 Months',  'Comprehensive computer skills training', 1, 7),
('computer', 'DTA',  'Diploma in Taxation & Accountancy (DTA)',         '6 Months',  'Master tax and accounting software', 0, 8),
('computer', 'DTP',  'Diploma in Desktop Publishing (DTP)',             '6 Months',  'Advanced graphic design and publishing', 0, 9),
('computer', 'DCAD', 'Diploma in Computer Aided Design (DCAD)',         '6 Months',  'Advanced CAD and 3D modeling', 0, 10),
('computer', 'DWD',  'Diploma in Web Designing (DWD)',                  '6 Months',  'Professional web development skills', 0, 11),
('computer', 'DCAT', 'Diploma in Computer Application with Tally (DCAT)','9 Months', 'Computer skills plus accounting expertise', 0, 12),
('computer', 'ADCA', 'Advance Diploma in Computer Application (ADCA)',  '12 Months', 'Complete IT professional training program', 1, 13),
('english', 'ENG',  'Spoken English & Personality Development', '3 Months', 'Transform your overall personality', 0, 1);

-- ---------------------------------------------------------------------
-- Certificates (populated by the admin's Excel/CSV upload)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    student_name VARCHAR(150) NOT NULL,
    course_name VARCHAR(150) DEFAULT NULL,
    duration VARCHAR(50) DEFAULT NULL,
    grade VARCHAR(20) DEFAULT NULL,
    issue_date VARCHAR(50) DEFAULT NULL,
    father_name VARCHAR(150) DEFAULT NULL,
    extra_info VARCHAR(255) DEFAULT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Contact form submissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    course VARCHAR(100) DEFAULT NULL,
    message TEXT,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
