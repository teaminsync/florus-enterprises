-- Seed categories (17 total)
insert into categories (name, slug, display_order) values
  ('Pain Management', 'pain-management', 1),
  ('Antibiotics', 'antibiotics', 2),
  ('CNS', 'cns', 3),
  ('Neurology', 'neurology', 4),
  ('Gastro', 'gastro', 5),
  ('Respiratory', 'respiratory', 6),
  ('Antihistamine', 'antihistamine', 7),
  ('General Health', 'general-health', 8),
  ('Nutraceutical & Multivitamin', 'nutraceutical-multivitamin', 9),
  ('Dietary', 'dietary', 10),
  ('Gynecology', 'gynecology', 11),
  ('Cardiology', 'cardiology', 12),
  ('Anti-Diabetic', 'anti-diabetic', 13),
  ('Anti-Cold', 'anti-cold', 14),
  ('Urology', 'urology', 15),
  ('Dermatology', 'dermatology', 16),
  ('Oral Care', 'oral-care', 17);

-- Seed products (23 total)
insert into products (sap_code, name, slug, composition, category_id, dosage_form, manufacturer, brand_line, pack_size, case_size, mrp, sp, is_upcoming, is_active) values
  -- Pain Management
  ('4500680', 'ACTINAC P TAB', 'actinac-p-tab', 'Aceclofenac 100mg + Paracetamol 325mg Tablets', (select id from categories where slug = 'pain-management'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Nexxon', '20X10', '45x20x10', 66.56, 15.50, false, true),
  
  -- Antibiotics (4 products)
  ('4500594', 'CLAVIN-625', 'clavin-625', 'Amoxycillin 500mg + Clavulanate 125mg Film Coated', (select id from categories where slug = 'antibiotics'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Nexxon', '10x01x10Tab', '36x10x1x10', 195.47, 74.00, false, true),
  ('4501015', 'XYNIX INJ 1GM,1''S', 'xynix-inj-1gm-1s', 'Ceftriaxone Injection IP 1g', (select id from categories where slug = 'antibiotics'), 'injection', 'Ajanta Pharma Ltd', 'Axera Critical Care', '20x20x1.0gm', '400 Vials', 64.16, 22.50, false, true),
  ('5043146', 'LIVAPENEM 1GM INJ.', 'livapenem-1gm-inj', 'Meropenem Injection 1gm', (select id from categories where slug = 'antibiotics'), 'injection', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Critical Care', '1X1GM', '1GM', 1017.76, 140.00, false, true),
  ('5040287', 'TAZODAC 4.5MG', 'tazodac-4-5mg', 'Piperacillin sodium USP eq. to Piperacillin 4gm + Sterile Tazobactam Sodium eq. to Tazobactam 0.5gm', (select id from categories where slug = 'antibiotics'), 'injection', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Critical Care', '120X10X1X10X1X4.5GM', '120X1X4.5GM', 426.66, 80.00, false, true),
  
  -- CNS
  ('4501456', 'COBAL FORTE HG CAP', 'cobal-forte-hg-cap', 'Methylcobalamine 1500mcg + Pyridoxine Hydrochloride 3mg + Alphaliopic Acid 100mg + Folic Acid 1.5mg', (select id from categories where slug = 'cns'), 'capsule', 'Ajanta Pharma Ltd', 'Axera Nexxon', '3X10', '24X10X3X10', 168.28, 43.00, false, true),
  
  -- General Health
  ('4501192', 'AXERA 5G SOFT GEL CAP,10''S', 'axera-5g-soft-gel-cap-10s', 'Omega 3 Fatty Acid, Ginseng, Gincogo Biloba Extract, Grape Seed Extract, Ginger Root, Green Tea Extract, Citrus Bioflavonoids, Lactic Acid Bacillus, Wheat Germ Oil, Biotin, Luten, Multiminerals and Multivitamins Soft Gelatin Capsules', (select id from categories where slug = 'general-health'), 'softgel-capsule', 'Ajanta Pharma Ltd', 'Axera Nexxon', '10X10', '60x10x1x10', 212.67, 34.00, false, true),
  
  -- Gastro
  ('4501755', 'AXEVOMI - MD 4', 'axevomi-md-4', 'Ondansetron 4 Mg (Mouth Dissolving) Tablets', (select id from categories where slug = 'gastro'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Nexxon', '20x10', '45x20x10', 53.96, 7.50, false, true),
  
  -- Gynecology
  ('4501521', 'FIMAGEN TAB 10MG,10''S', 'fimagen-tab-10mg-10s', 'Dydrogesterone IP 10mg', (select id from categories where slug = 'gynecology'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Nexxon', '10X10TAB', '16X10X10TAB', 564.38, 165.00, false, true),
  
  -- Respiratory
  ('5040022', 'ALDEREC-M', 'alderec-m', 'Fexofenadine HCl IP 120mg + Montelukast Sodium IP Eq. to Montelukast 10mg', (select id from categories where slug = 'respiratory'), 'tablet', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '50X10X1X10 TAB', '10x1x10 TAB', 226.87, 42.00, false, true),
  
  -- Antihistamine
  ('5040021', 'BALISTA-20', 'balista-20', 'Bilastine 20mg', (select id from categories where slug = 'antihistamine'), 'tablet', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '50x10x10 tab', '10X10', 152.81, 28.75, false, true),
  
  -- Neurology
  ('5037775', 'BETAHART-16', 'betahart-16', 'Betahistine Hydrochloride Tablet IP 16mg', (select id from categories where slug = 'neurology'), 'tablet', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '100X10X10 TAB', '10 x 10 (Alu-Alu Pack)', 123.75, 12.00, false, true),
  
  -- Nutraceutical & Multivitamin
  ('5037539', 'CHOLVAC-D3', 'cholvac-d3', 'Cholecalciferol Capsules USP 60000 I.U.', (select id from categories where slug = 'nutraceutical-multivitamin'), 'capsule', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '50X10X1X4 TAB', '10 x 1 x 4 TAB', 131.42, 16.00, false, true),
  
  -- Dietary
  ('5042572', 'GELACT CAPSULE', 'gelact-capsule', 'Streptococcus faecalis 30 million + Clostridium butyricum 2 million + Bacillus mesentericus 1 million + Lactic acid bacillus 50 million spores', (select id from categories where slug = 'dietary'), 'capsule', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '60X10X1X10 TAB', '10X10', 195.93, 22.00, false, true),
  
  -- Cardiology
  ('5042574', 'RESUTA GOLD 10MG', 'resuta-gold-10mg', 'Rosuvastatin Calcium IP eq. to Rosuvastatin 10mg + Aspirin IP 75mg + Clopidogrel Bisulphate IP eq. to Clopidogrel 75mg', (select id from categories where slug = 'cardiology'), 'capsule', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '50X10X1X10 TAB', '10 x 1 x 10 TAB', 146.05, 37.50, false, true),
  
  -- Anti-Diabetic (4 products, 2 upcoming with null SP)
  ('5041058', 'METGLENIDE-G1', 'metglenide-g1', 'Glimepiride IP 1mg + Metformin Hydrochloride IP 500mg (Prolonged-release)', (select id from categories where slug = 'anti-diabetic'), 'tablet', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '60x10x10tab', '10x1x10 TAB', 72.75, 16.00, false, true),
  ('4501885', 'APGLISA M1 TAB 1/500MG,15''S', 'apglisa-m1-tab-1-500mg-15s', 'Glimepiride & Metformin Sr Tab 1/500Mg', (select id from categories where slug = 'anti-diabetic'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Trion', '10X15', '100X10X15', 86.72, 18.00, false, true),
  ('4501884', 'APGLISA M1 FORTE SR TAB 1/1000MG,15''S', 'apglisa-m1-forte-sr-tab-1-1000mg-15s', 'Glimepiride & Metformin SR Tab 1/1000mg', (select id from categories where slug = 'anti-diabetic'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Trion', null, null, 132.18, null, true, true),
  ('4502055', 'EMPADIL TAB 10MG, 10''S', 'empadil-tab-10mg-10s', 'Empagliflozin 10mg Tablets', (select id from categories where slug = 'anti-diabetic'), 'tablet', 'Ajanta Pharma Ltd', 'Axera Trion', null, null, 112.50, null, true, true),
  
  -- Anti-Cold
  ('5041408', 'ZYNOCOFF COLD PLUS TAB', 'zynocoff-cold-plus-tab', 'Paracetamol IP 500mg + Phenylephrine Hydrochloride IP 5mg + Caffeine (Anhydrous) IP 30mg + Diphenhydramine Hydrochloride IP 25mg', (select id from categories where slug = 'anti-cold'), 'tablet', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '60X20X10 TAB', '20X10 alu alu', 38.85, 9.80, false, true),
  
  -- Urology
  ('4500360', 'SILOPRO-D CAP', 'silopro-d-cap', 'Dutasteride 0.5mg + Silidosin 8mg Tablets', (select id from categories where slug = 'urology'), 'capsule', 'Ajanta Pharma Ltd', 'Axera Trion', '10X10', '20x10x10', 461.72, 90.00, false, true),
  
  -- Dermatology
  ('5032251', 'ZYITRA 200', 'zyitra-200', 'Itraconazole 200mg', (select id from categories where slug = 'dermatology'), 'capsule', 'Zydus Healthcare Ltd (German Remedies)', 'Sorvus Franchisee', '30x10x10 cap', '10X10 CAP', 236.25, 60.00, false, true),
  
  -- Oral Care
  ('4501787', 'ALCADIN GARGLES SOLUTION 0.5%,150ML', 'alcadin-gargles-solution-0-5-150ml', 'Povidone-Iodine Gargle', (select id from categories where slug = 'oral-care'), 'gargle-solution', 'Ajanta Pharma Ltd', 'Axera Spectrum', '1X100ML', '1x200x100ml', 140.62, 41.50, false, true);
