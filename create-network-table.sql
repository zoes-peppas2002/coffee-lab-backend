-- Δημιουργία πίνακα network_stores
CREATE TABLE IF NOT EXISTS network_stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  area_manager INT,
  coffee_specialist INT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (area_manager) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (coffee_specialist) REFERENCES users(id) ON DELETE SET NULL
);

-- Δημιουργία ευρετηρίου για γρήγορη αναζήτηση με βάση το όνομα
CREATE INDEX idx_network_stores_name ON network_stores(name);
