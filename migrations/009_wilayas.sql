-- ============================================================
-- Migration 009: Wilayas Table + System Fixes
-- ============================================================

CREATE TABLE IF NOT EXISTS wilayas (
  id       SERIAL PRIMARY KEY,
  code     INTEGER UNIQUE NOT NULL,
  name_ar  TEXT NOT NULL,
  name_fr  TEXT NOT NULL,
  name_en  TEXT NOT NULL,
  region   TEXT NOT NULL,
  carrier  TEXT NOT NULL DEFAULT 'Yalidine'
);

INSERT INTO wilayas (code,name_ar,name_fr,name_en,region,carrier) VALUES
(1,'أدرار','Adrar','Adrar','Sud','Amana'),
(2,'الشلف','Chlef','Chlef','Centre','Yalidine'),
(3,'الأغواط','Laghouat','Laghouat','Sud','Amana'),
(4,'أم البواقي','Oum El Bouaghi','Oum El Bouaghi','Est','Noest'),
(5,'باتنة','Batna','Batna','Est','Noest'),
(6,'بجاية','Béjaïa','Bejaia','Centre','Yalidine'),
(7,'بسكرة','Biskra','Biskra','Sud','Amana'),
(8,'بشار','Béchar','Bechar','Sud','Amana'),
(9,'البليدة','Blida','Blida','Centre','Yalidine'),
(10,'البويرة','Bouira','Bouira','Centre','Yalidine'),
(11,'تمنراست','Tamanrasset','Tamanrasset','Sud','Amana'),
(12,'تبسة','Tébessa','Tebessa','Est','Noest'),
(13,'تلمسان','Tlemcen','Tlemcen','Ouest','ZR Express'),
(14,'تيارت','Tiaret','Tiaret','Ouest','ZR Express'),
(15,'تيزي وزو','Tizi Ouzou','Tizi Ouzou','Centre','Yalidine'),
(16,'الجزائر','Alger','Algiers','Centre','Yalidine'),
(17,'الجلفة','Djelfa','Djelfa','Sud','Amana'),
(18,'جيجل','Jijel','Jijel','Est','Noest'),
(19,'سطيف','Sétif','Setif','Est','Noest'),
(20,'سعيدة','Saïda','Saida','Ouest','ZR Express'),
(21,'سكيكدة','Skikda','Skikda','Est','Noest'),
(22,'سيدي بلعباس','Sidi Bel Abbès','Sidi Bel Abbes','Ouest','ZR Express'),
(23,'عنابة','Annaba','Annaba','Est','Noest'),
(24,'قالمة','Guelma','Guelma','Est','Noest'),
(25,'قسنطينة','Constantine','Constantine','Est','Noest'),
(26,'المدية','Médéa','Medea','Centre','Yalidine'),
(27,'مستغانم','Mostaganem','Mostaganem','Ouest','ZR Express'),
(28,'المسيلة','M''Sila','M''Sila','Est','Noest'),
(29,'معسكر','Mascara','Mascara','Ouest','ZR Express'),
(30,'ورقلة','Ouargla','Ouargla','Sud','Amana'),
(31,'وهران','Oran','Oran','Ouest','ZR Express'),
(32,'البيض','El Bayadh','El Bayadh','Ouest','ZR Express'),
(33,'إليزي','Illizi','Illizi','Sud','Amana'),
(34,'برج بوعريريج','Bordj Bou Arréridj','Bordj Bou Arreridj','Est','Noest'),
(35,'بومرداس','Boumerdès','Boumerdes','Centre','Yalidine'),
(36,'الطارف','El Tarf','El Tarf','Est','Noest'),
(37,'تندوف','Tindouf','Tindouf','Sud','Amana'),
(38,'تيسمسيلت','Tissemsilt','Tissemsilt','Centre','Yalidine'),
(39,'الوادي','El Oued','El Oued','Sud','Amana'),
(40,'خنشلة','Khenchela','Khenchela','Est','Noest'),
(41,'سوق أهراس','Souk Ahras','Souk Ahras','Est','Noest'),
(42,'تيبازة','Tipaza','Tipaza','Centre','Yalidine'),
(43,'ميلة','Mila','Mila','Est','Noest'),
(44,'عين الدفلى','Aïn Defla','Ain Defla','Centre','Yalidine'),
(45,'النعامة','Naâma','Naama','Ouest','ZR Express'),
(46,'عين تموشنت','Aïn Témouchent','Ain Temouchent','Ouest','ZR Express'),
(47,'غرداية','Ghardaïa','Ghardaia','Sud','Amana'),
(48,'غليزان','Relizane','Relizane','Ouest','ZR Express'),
(49,'المغير','El M''Ghair','El M''Ghair','Sud','Amana'),
(50,'المنيعة','El Meniaa','El Meniaa','Sud','Amana'),
(51,'أولاد جلال','Ouled Djellal','Ouled Djellal','Sud','Amana'),
(52,'برج باجي مختار','Bordj Badji Mokhtar','Bordj Badji Mokhtar','Sud','Amana'),
(53,'بني عباس','Béni Abbès','Beni Abbes','Sud','Amana'),
(54,'تيميمون','Timimoun','Timimoun','Sud','Amana'),
(55,'تقرت','Touggourt','Touggourt','Sud','Amana'),
(56,'جانت','Djanet','Djanet','Sud','Amana'),
(57,'عين صالح','In Salah','In Salah','Sud','Amana'),
(58,'عين قزام','In Guezzam','In Guezzam','Sud','Amana')
ON CONFLICT (code) DO NOTHING;

-- Language column on profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Fix: add product_name column to orders if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';

-- Index for faster wilaya queries
CREATE INDEX IF NOT EXISTS idx_orders_wilaya ON orders(wilaya);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

COMMENT ON TABLE wilayas IS 'All 58 Algerian wilayas with carrier assignments';
