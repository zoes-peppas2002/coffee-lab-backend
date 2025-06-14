-- 1. Διαγραφή όλων των καταστημάτων από τον πίνακα network_stores
DELETE FROM network_stores;

-- 2. Διαγραφή όλων των αντιστοιχίσεων από τον πίνακα stores
DELETE FROM stores;

-- 3. Επαναφορά του auto-increment counter για τον πίνακα network_stores
ALTER TABLE network_stores AUTO_INCREMENT = 1;

-- 4. Επαναφορά του auto-increment counter για τον πίνακα stores
ALTER TABLE stores AUTO_INCREMENT = 1;

-- 5. Προσθήκη δοκιμαστικών καταστημάτων (προαιρετικό)
-- Αντικαταστήστε τα IDs με τα πραγματικά IDs των χρηστών σας

-- Παράδειγμα προσθήκης καταστήματος "Σύνταγμα" με area_manager ID=1, coffee_specialist ID=5
INSERT INTO network_stores (name, area_manager, coffee_specialist, omada_krousis, created_at) 
VALUES ('Σύνταγμα', 1, 5, NULL, NOW());

-- Προσθήκη αντιστοίχισης για τον area_manager
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Σύνταγμα', 1, NOW());

-- Προσθήκη αντιστοίχισης για τον coffee_specialist
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Σύνταγμα', 5, NOW());

-- Παράδειγμα προσθήκης καταστήματος "Ομόνοια" με area_manager ID=2, coffee_specialist ID=6
INSERT INTO network_stores (name, area_manager, coffee_specialist, omada_krousis, created_at) 
VALUES ('Ομόνοια', 2, 6, NULL, NOW());

-- Προσθήκη αντιστοίχισης για τον area_manager
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Ομόνοια', 2, NOW());

-- Προσθήκη αντιστοίχισης για τον coffee_specialist
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Ομόνοια', 6, NOW());

-- Παράδειγμα προσθήκης καταστήματος "Μοσχάτο" με area_manager ID=1, coffee_specialist ID=5, omada_krousis ID=10
INSERT INTO network_stores (name, area_manager, coffee_specialist, omada_krousis, created_at) 
VALUES ('Μοσχάτο', 1, 5, 10, NOW());

-- Προσθήκη αντιστοίχισης για τον area_manager
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Μοσχάτο', 1, NOW());

-- Προσθήκη αντιστοίχισης για τον coffee_specialist
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Μοσχάτο', 5, NOW());

-- Προσθήκη αντιστοίχισης για την omada_krousis
INSERT INTO stores (name, assigned_to, created_at) 
VALUES ('Μοσχάτο', 10, NOW());
