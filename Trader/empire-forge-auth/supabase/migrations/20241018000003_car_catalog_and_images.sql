-- 20241018000003_car_catalog_and_images.sql
-- Purpose: Create car_catalog table with all 28 cars, add image columns, create car_assets table
-- Idempotent: safe to re-run

BEGIN;

-- Create car_catalog table (specific car models within each tier)
CREATE TABLE IF NOT EXISTS car_catalog (
  car_key TEXT PRIMARY KEY,
  tier_key TEXT NOT NULL REFERENCES car_tiers(tier_key) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  manufacturer TEXT,
  year INTEGER,
  card_image_url TEXT,
  thumb_image_url TEXT,
  render_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS car_catalog_tier_idx ON car_catalog(tier_key);

-- Seed car_catalog with all 28 cars (7 tiers × 4 cars each)
INSERT INTO car_catalog (car_key, tier_key, display_name, manufacturer, year) VALUES
  -- GODSPEED (4 cars)
  ('lotus_evija', 'godspeed', 'Lotus Evija', 'Lotus', 2020),
  ('pagani_utopia', 'godspeed', 'Pagani Utopia', 'Pagani', 2022),
  ('solus_gt', 'godspeed', 'McLaren Solus GT', 'McLaren', 2023),
  ('la_voiture_noire', 'godspeed', 'La Voiture Noire', 'Bugatti', 2019),
  
  -- PROTOTYPE (4 cars)
  ('amg_one', 'prototype', 'Mercedes-AMG ONE', 'Mercedes-AMG', 2022),
  ('valkyrie', 'prototype', 'Aston Martin Valkyrie', 'Aston Martin', 2021),
  ('devel_sixteen', 'prototype', 'Devel Sixteen', 'Devel', 2017),
  ('terzo_millennio', 'prototype', 'Lamborghini Terzo Millennio', 'Lamborghini', 2017),
  
  -- HYPERCAR (4 cars)
  ('chiron', 'hypercar', 'Bugatti Chiron', 'Bugatti', 2016),
  ('jesko', 'hypercar', 'Koenigsegg Jesko', 'Koenigsegg', 2020),
  ('speedtail', 'hypercar', 'McLaren Speedtail', 'McLaren', 2020),
  ('nevera', 'hypercar', 'Rimac Nevera', 'Rimac', 2021),
  
  -- SUPERCAR (4 cars)
  ('aventador', 'supercar', 'Lamborghini Aventador', 'Lamborghini', 2011),
  ('ferrari_488_gtb', 'supercar', 'Ferrari 488 GTB', 'Ferrari', 2015),
  ('mclaren_720s', 'supercar', 'McLaren 720S', 'McLaren', 2017),
  ('audi_r8_v10', 'supercar', 'Audi R8 V10', 'Audi', 2015),
  
  -- SPORT (4 cars)
  ('supra', 'sport', 'Toyota Supra', 'Toyota', 2019),
  ('gt350r', 'sport', 'Ford Mustang GT350R', 'Ford', 2016),
  ('gt4', 'sport', 'Porsche Cayman GT4', 'Porsche', 2015),
  ('m4_gts', 'sport', 'BMW M4 GTS', 'BMW', 2016),
  
  -- STREET (4 cars)
  ('skyline', 'street', 'Nissan Skyline GT-R', 'Nissan', 1999),
  ('rx7', 'street', 'Mazda RX-7', 'Mazda', 1993),
  ('evo', 'street', 'Mitsubishi Lancer Evolution', 'Mitsubishi', 2006),
  ('wrx_sti', 'street', 'Subaru WRX STI', 'Subaru', 2015),
  
  -- BEATER (4 cars)
  ('civic', 'beater', 'Honda Civic', 'Honda', 2020),
  ('corolla', 'beater', 'Toyota Corolla', 'Toyota', 2020),
  ('f150', 'beater', 'Ford F-150', 'Ford', 2020),
  ('miata', 'beater', 'Mazda MX-5 Miata', 'Mazda', 2019)
ON CONFLICT (car_key) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      manufacturer = EXCLUDED.manufacturer,
      year = EXCLUDED.year;

-- Add badge image to car_tiers (for tier badges in UI)
ALTER TABLE car_tiers
  ADD COLUMN IF NOT EXISTS badge_image_url TEXT;

-- Create pack_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS pack_types (
  pack_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  cost_bonds NUMERIC NOT NULL DEFAULT 0,
  pack_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed basic pack type (booster)
INSERT INTO pack_types (pack_type, display_name, cost_bonds) VALUES
  ('booster', 'Booster Pack', 100)
ON CONFLICT (pack_type) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      cost_bonds = EXCLUDED.cost_bonds;

-- Create car_assets table for flexible asset management
-- Allows multiple images per car (card, thumb, render, alt variants)
CREATE TABLE IF NOT EXISTS car_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_key TEXT NOT NULL REFERENCES car_catalog(car_key) ON DELETE CASCADE,
  asset_key TEXT NOT NULL,  -- filename/slug for asset
  url TEXT NOT NULL,         -- full URL to image
  kind TEXT NOT NULL CHECK (kind IN ('card','thumb','render','badge','pack','alt')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS car_assets_car_key_idx ON car_assets(car_key);
CREATE UNIQUE INDEX IF NOT EXISTS car_assets_unique ON car_assets(car_key, asset_key, kind);

COMMIT;

-- Verification queries (run after migration):
-- SELECT car_key, tier_key, display_name FROM car_catalog ORDER BY tier_key, car_key;
-- SELECT COUNT(*) AS total_cars FROM car_catalog;
-- SELECT tier_key, COUNT(*) AS cars_per_tier FROM car_catalog GROUP BY tier_key ORDER BY tier_key;

