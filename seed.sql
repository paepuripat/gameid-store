-- Sample products
INSERT INTO products (id, name, description, image_url, price, active) VALUES
  ('prod-001', 'Valorant Points 1000 VP', 'บัญชี Valorant พร้อม 1,000 Valorant Points พร้อมใช้งาน', NULL, 199, 1),
  ('prod-002', 'Genshin Impact AR30', 'บัญชี Genshin Impact Adventure Rank 30 พร้อม Primogems', NULL, 299, 1),
  ('prod-003', 'PUBG Mobile UC Pack', 'บัญชี PUBG Mobile พร้อม UC 600 สำหรับซื้อ Royal Pass', NULL, 149, 1);

-- Sample inventory (available credentials for each product)
INSERT INTO inventory (id, product_id, username, password, notes, status) VALUES
  ('inv-001', 'prod-001', 'valo_user_001@gmail.com', 'ValoPass#A1B2', 'Server: Asia', 'available'),
  ('inv-002', 'prod-001', 'valo_user_002@gmail.com', 'ValoPass#C3D4', 'Server: Asia', 'available'),
  ('inv-003', 'prod-002', 'genshin_ar30_001', 'GenshinPwd!X9Y8', 'AR30, Mondstadt unlocked, 3000 primos', 'available'),
  ('inv-004', 'prod-002', 'genshin_ar30_002', 'GenshinPwd!Z7W6', 'AR30, all starters, 2500 primos', 'available'),
  ('inv-005', 'prod-003', 'pubg_uc_001@gmail.com', 'PubgUC#Q5R6', '600 UC remaining', 'available');
