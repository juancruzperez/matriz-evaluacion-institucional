-- Add geographic coordinates to institutions

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;