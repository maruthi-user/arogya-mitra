-- Queryable columns for the provider/pharmacy catalog and care services. The JSON document stays the full
-- record; CatalogRepository and ServiceColumns write these on every save, and DocumentColumnsBackfill fills
-- them for rows saved before V9.
ALTER TABLE entities ADD COLUMN IF NOT EXISTS name VARCHAR(120);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS village VARCHAR(40);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS organization VARCHAR(100);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS business_type VARCHAR(30);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS provider_type VARCHAR(30);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS is_open BOOLEAN;
CREATE INDEX IF NOT EXISTS entities_kind_village ON entities(kind, village);
CREATE INDEX IF NOT EXISTS entities_business_type ON entities(business_type);

ALTER TABLE care_services ADD COLUMN IF NOT EXISTS kind VARCHAR(30);
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS title VARCHAR(120);
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS business_type VARCHAR(30);
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS organization VARCHAR(100);
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS total_fee INTEGER;
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS available BOOLEAN;
ALTER TABLE care_services ADD COLUMN IF NOT EXISTS updated_at BIGINT;
CREATE INDEX IF NOT EXISTS care_services_listing ON care_services(kind, approval, active);
