-- SBS Master Catalogue Schema and Data Population
-- Source: Official CHI (Council of Health Insurance) SBS V3.1
-- Generated: 2026-01-30

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sbs_master_catalogue CASCADE;
DROP TABLE IF EXISTS sbs_categories CASCADE;
DROP TABLE IF EXISTS sbs_snomed_map CASCADE;
DROP TABLE IF EXISTS sbs_achi_map CASCADE;
DROP TABLE IF EXISTS dental_services CASCADE;

-- Create SBS Categories table
CREATE TABLE sbs_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(20) NOT NULL UNIQUE,
    category_name VARCHAR(255) NOT NULL,
    category_name_ar VARCHAR(255),
    parent_category_id INTEGER REFERENCES sbs_categories(category_id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create main SBS Master Catalogue table
CREATE TABLE sbs_master_catalogue (
    id SERIAL PRIMARY KEY,
    sbs_id VARCHAR(20) NOT NULL UNIQUE,
    sbs_code VARCHAR(20) NOT NULL,
    description_en TEXT NOT NULL,
    description_ar TEXT,
    long_description TEXT,
    category_id INTEGER REFERENCES sbs_categories(category_id),
    subcategory VARCHAR(255),
    block_code VARCHAR(20),
    chapter VARCHAR(100),
    unit VARCHAR(50),
    standard_price DECIMAL(10, 2),
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'SAR',
    requires_prior_auth BOOLEAN DEFAULT FALSE,
    requires_diagnosis BOOLEAN DEFAULT FALSE,
    gender_restriction VARCHAR(10), -- 'M', 'F', or NULL for both
    age_min INTEGER,
    age_max INTEGER,
    notes TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(10) DEFAULT '3.1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_sbs_code ON sbs_master_catalogue(sbs_code);
CREATE INDEX idx_sbs_category ON sbs_master_catalogue(category_id);
CREATE INDEX idx_sbs_subcategory ON sbs_master_catalogue(subcategory);
CREATE INDEX idx_sbs_active ON sbs_master_catalogue(is_active);
CREATE INDEX idx_sbs_description_en ON sbs_master_catalogue USING GIN (to_tsvector('english', description_en));

-- Create SBS to SNOMED mapping table
CREATE TABLE sbs_snomed_map (
    id SERIAL PRIMARY KEY,
    sbs_code VARCHAR(20) NOT NULL,
    snomed_code VARCHAR(20) NOT NULL,
    snomed_description TEXT,
    map_type VARCHAR(50), -- 'equivalent', 'narrower', 'broader', 'related'
    confidence DECIMAL(3, 2) DEFAULT 1.0,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sbs_code) REFERENCES sbs_master_catalogue(sbs_id) ON DELETE CASCADE
);

CREATE INDEX idx_snomed_sbs ON sbs_snomed_map(sbs_code);
CREATE INDEX idx_snomed_code ON sbs_snomed_map(snomed_code);

-- Create SBS to ACHI mapping table
CREATE TABLE sbs_achi_map (
    id SERIAL PRIMARY KEY,
    sbs_code VARCHAR(20) NOT NULL,
    achi_code VARCHAR(20) NOT NULL,
    achi_description TEXT,
    achi_edition VARCHAR(10) DEFAULT '10th',
    map_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sbs_code) REFERENCES sbs_master_catalogue(sbs_id) ON DELETE CASCADE
);

CREATE INDEX idx_achi_sbs ON sbs_achi_map(sbs_code);
CREATE INDEX idx_achi_code ON sbs_achi_map(achi_code);

-- Create Dental Services table with pricing
CREATE TABLE dental_services (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(20) NOT NULL UNIQUE,
    sbs_code VARCHAR(20),
    service_name_en TEXT NOT NULL,
    service_name_ar TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    govt_price DECIMAL(10, 2),
    private_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'SAR',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sbs_code) REFERENCES sbs_master_catalogue(sbs_id) ON DELETE SET NULL
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sbs_catalogue_updated_at
    BEFORE UPDATE ON sbs_master_catalogue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sbs_categories_updated_at
    BEFORE UPDATE ON sbs_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories (will be populated from JSON data)
INSERT INTO sbs_categories (category_code, category_name, display_order) VALUES
('01', 'Procedures on Nervous System', 1),
('02', 'Procedures on Endocrine System', 2),
('03', 'Procedures on Eye and Adnexa', 3),
('04', 'Procedures on Ear and Mastoid Process', 4),
('05', 'Procedures on Nose, Mouth and Pharynx', 5),
('06', 'Dental Services', 6),
('07', 'Procedures on Respiratory System', 7),
('08', 'Procedures on Cardiovascular System', 8),
('09', 'Procedures on Blood and Blood-forming Organs', 9),
('10', 'Procedures on Digestive System', 10),
('11', 'Procedures on Urinary System', 11),
('12', 'Procedures on Male Genital Organs', 12),
('13', 'Procedures on Female Genital Organs', 13),
('14', 'Procedures on Musculoskeletal System', 14),
('15', 'Dermatological and Plastic Procedures', 15),
('16', 'Procedures on Breast', 16),
('17', 'Radiation Oncology Procedures', 17),
('18', 'Non-invasive, Cognitive and Other Interventions', 18),
('19', 'Imaging Services', 19),
('20', 'Allied Health Interventions', 20),
('21', 'Laboratory Investigations', 21),
('22', 'Pharmacy and Medication Services', 22),
('23', 'Obstetric Procedures', 23),
('99', 'Miscellaneous and Administrative', 99)
ON CONFLICT (category_code) DO NOTHING;

-- View for easy querying
CREATE OR REPLACE VIEW v_sbs_full AS
SELECT 
    m.id,
    m.sbs_id,
    m.sbs_code,
    m.description_en,
    m.description_ar,
    m.subcategory,
    c.category_code,
    c.category_name,
    m.standard_price,
    m.unit,
    m.is_active,
    m.version
FROM sbs_master_catalogue m
LEFT JOIN sbs_categories c ON m.category_id = c.category_id
WHERE m.is_active = TRUE;

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO sbs_readonly;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO sbs_admin;

COMMENT ON TABLE sbs_master_catalogue IS 'Official Saudi Billing System V3.1 code catalogue from CHI';
COMMENT ON TABLE sbs_snomed_map IS 'Mapping between SBS codes and SNOMED CT';
COMMENT ON TABLE sbs_achi_map IS 'Mapping between SBS codes and Australian ACHI 10th Edition';
COMMENT ON TABLE dental_services IS 'Dental services with government sector pricing';
