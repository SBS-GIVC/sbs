-- ============================================================================
-- Saudi Billing System (SBS) Integration Engine - Database Schema
-- Version: 1.0
-- Description: Complete database schema for SBS integration platform
-- ============================================================================

-- ============================================================================
-- 1. SBS Master Catalogue (Official CHI Reference)
-- ============================================================================

CREATE TABLE sbs_master_catalogue (
    sbs_id VARCHAR(50) PRIMARY KEY,
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    version VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Lab', 'Radiology', 'Surgery', 'Consultation', 'Pharmacy', 'Procedure', 'Emergency', 'ICU', 'Dental', 'Maternity')),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    unit_type VARCHAR(20),
    standard_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster category lookups
CREATE INDEX idx_sbs_category ON sbs_master_catalogue(category);
CREATE INDEX idx_sbs_active ON sbs_master_catalogue(is_active, effective_date);

-- ============================================================================
-- 2. Facilities (Multi-Tenancy Support)
-- ============================================================================

CREATE TABLE facilities (
    facility_id SERIAL PRIMARY KEY,
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    facility_name VARCHAR(255) NOT NULL,
    facility_name_ar VARCHAR(255),
    chi_license_number VARCHAR(100) UNIQUE NOT NULL,
    accreditation_tier INT CHECK (accreditation_tier BETWEEN 1 AND 8),
    region VARCHAR(50),
    city VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    nphies_payer_id VARCHAR(100),
    certificate_serial_number VARCHAR(255),
    certificate_expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facility_active ON facilities(is_active);

-- ============================================================================
-- 3. Facility Internal Codes (Hospital-Specific Codes)
-- ============================================================================

CREATE TABLE facility_internal_codes (
    internal_code_id SERIAL PRIMARY KEY,
    internal_code VARCHAR(100) NOT NULL,
    facility_id INT NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
    local_description TEXT NOT NULL,
    local_description_ar TEXT,
    price_gross DECIMAL(10,2),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, internal_code)
);

CREATE INDEX idx_internal_code_lookup ON facility_internal_codes(facility_id, internal_code, is_active);

-- ============================================================================
-- 4. SBS Normalization Map (Core Mapping Engine)
-- ============================================================================

CREATE TABLE sbs_normalization_map (
    map_id BIGSERIAL PRIMARY KEY,
    internal_code_id INT NOT NULL REFERENCES facility_internal_codes(internal_code_id) ON DELETE CASCADE,
    sbs_code VARCHAR(50) NOT NULL REFERENCES sbs_master_catalogue(sbs_id),
    confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
    mapping_source VARCHAR(20) CHECK (mapping_source IN ('manual', 'ai', 'rule_based')),
    is_active BOOLEAN DEFAULT TRUE,
    validated_by VARCHAR(100),
    validation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(internal_code_id, sbs_code)
);

CREATE INDEX idx_normalization_active ON sbs_normalization_map(internal_code_id, is_active);
CREATE INDEX idx_normalization_confidence ON sbs_normalization_map(confidence DESC);

-- ============================================================================
-- 5. Pricing Tier Rules (Financial Compliance)
-- ============================================================================

CREATE TABLE pricing_tier_rules (
    tier_level INT PRIMARY KEY CHECK (tier_level BETWEEN 1 AND 8),
    tier_description VARCHAR(255) NOT NULL,
    tier_description_ar VARCHAR(255),
    markup_pct FLOAT NOT NULL CHECK (markup_pct >= 0 AND markup_pct <= 100),
    base_coverage_limit DECIMAL(12,2),
    annual_coverage_limit DECIMAL(12,2),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pricing_tier_rules (tier_level, tier_description, tier_description_ar, markup_pct, effective_date) VALUES
(1, 'Reference Hospital', 'مستشفى مرجعي', 10.0, '2024-01-01'),
(2, 'Tertiary Care Center', 'مركز رعاية ثالثي', 20.0, '2024-01-01'),
(3, 'Specialized Hospital', 'مستشفى متخصص', 30.0, '2024-01-01'),
(4, 'General Hospital (JCI)', 'مستشفى عام (JCI)', 40.0, '2024-01-01'),
(5, 'General Hospital (CBAHI)', 'مستشفى عام (CBAHI)', 50.0, '2024-01-01'),
(6, 'Private Clinic (Level A)', 'عيادة خاصة (مستوى أ)', 60.0, '2024-01-01'),
(7, 'Private Clinic (Level B)', 'عيادة خاصة (مستوى ب)', 70.0, '2024-01-01'),
(8, 'Primary Care Center', 'مركز رعاية أولية', 75.0, '2024-01-01');

-- ============================================================================
-- 6. Service Bundles (CHI Bundle Rules)
-- ============================================================================

CREATE TABLE service_bundles (
    bundle_id SERIAL PRIMARY KEY,
    bundle_code VARCHAR(50) UNIQUE NOT NULL,
    bundle_name VARCHAR(255) NOT NULL,
    bundle_name_ar VARCHAR(255),
    bundle_description TEXT,
    total_allowed_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bundle_items (
    bundle_item_id SERIAL PRIMARY KEY,
    bundle_id INT NOT NULL REFERENCES service_bundles(bundle_id) ON DELETE CASCADE,
    sbs_code VARCHAR(50) NOT NULL REFERENCES sbs_master_catalogue(sbs_id),
    quantity INT DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, sbs_code)
);

-- ============================================================================
-- 7. NPHIES Transaction Log (Audit Trail)
-- ============================================================================

CREATE TABLE nphies_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    facility_id INT NOT NULL REFERENCES facilities(facility_id),
    transaction_uuid UUID DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('Claim', 'PreAuth', 'Eligibility', 'ClaimResponse')),
    fhir_payload JSONB NOT NULL,
    signature TEXT NOT NULL,
    nphies_transaction_id VARCHAR(255),
    http_status_code INT,
    response_payload JSONB,
    submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_timestamp TIMESTAMP,
    status VARCHAR(50) CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected', 'error')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_facility ON nphies_transactions(facility_id, submission_timestamp DESC);
CREATE INDEX idx_transaction_status ON nphies_transactions(status, submission_timestamp DESC);
CREATE INDEX idx_transaction_uuid ON nphies_transactions(transaction_uuid);

-- ============================================================================
-- 8. AI Normalization Cache (Performance Optimization)
-- ============================================================================

CREATE TABLE ai_normalization_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    description_hash VARCHAR(64) UNIQUE NOT NULL,
    original_description TEXT NOT NULL,
    suggested_sbs_code VARCHAR(50) REFERENCES sbs_master_catalogue(sbs_id),
    confidence_score FLOAT,
    hit_count INT DEFAULT 1,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_hash ON ai_normalization_cache(description_hash);
CREATE INDEX idx_cache_hits ON ai_normalization_cache(hit_count DESC);

-- ============================================================================
-- 9. Certificate Management
-- ============================================================================

CREATE TABLE facility_certificates (
    cert_id SERIAL PRIMARY KEY,
    facility_id INT NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
    cert_type VARCHAR(20) CHECK (cert_type IN ('mtls', 'signing', 'both')),
    serial_number VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    subject VARCHAR(255),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    thumbprint VARCHAR(255),
    private_key_path VARCHAR(500),
    public_cert_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_id, cert_type, serial_number)
);

CREATE INDEX idx_cert_expiry ON facility_certificates(valid_until, is_active);

-- ============================================================================
-- 10. System Audit Log
-- ============================================================================

CREATE TABLE system_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    user_id VARCHAR(100),
    facility_id INT REFERENCES facilities(facility_id),
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_timestamp ON system_audit_log(created_at DESC);
CREATE INDEX idx_audit_entity ON system_audit_log(entity_type, entity_id);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sbs_master_modtime BEFORE UPDATE ON sbs_master_catalogue FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_facilities_modtime BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_internal_codes_modtime BEFORE UPDATE ON facility_internal_codes FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_normalization_map_modtime BEFORE UPDATE ON sbs_normalization_map FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- Sample Data for Testing
-- ============================================================================

-- Sample SBS Codes
INSERT INTO sbs_master_catalogue (sbs_id, description_ar, description_en, version, category, effective_date, standard_price) VALUES
('SBS-LAB-001', 'تحليل صورة دم كاملة', 'Complete Blood Count (CBC)', 'V3.0', 'Lab', '2024-01-01', 50.00),
('SBS-RAD-001', 'أشعة سينية للصدر', 'Chest X-Ray', 'V3.0', 'Radiology', '2024-01-01', 150.00),
('SBS-CONS-001', 'استشارة طبية عامة', 'General Medical Consultation', 'V3.0', 'Consultation', '2024-01-01', 200.00),
('SBS-SURG-001', 'عملية استئصال الزائدة الدودية', 'Appendectomy', 'V3.0', 'Surgery', '2024-01-01', 5000.00);

-- Sample Facility
INSERT INTO facilities (facility_code, facility_name, facility_name_ar, chi_license_number, accreditation_tier, region, city) VALUES
('FAC-001', 'King Fahad Medical City', 'مدينة الملك فهد الطبية', 'CHI-RYD-001', 1, 'Riyadh', 'Riyadh');

-- Sample Internal Codes
INSERT INTO facility_internal_codes (internal_code, facility_id, local_description, price_gross) VALUES
('LAB-CBC-01', 1, 'CBC - Complete Blood Count Test', 60.00),
('RAD-CXR-01', 1, 'Chest X-Ray Standard', 180.00),
('CONS-GEN-01', 1, 'General Consultation - First Visit', 250.00);

-- Sample Normalization Mappings
INSERT INTO sbs_normalization_map (internal_code_id, sbs_code, confidence, mapping_source, is_active) VALUES
(1, 'SBS-LAB-001', 1.0, 'manual', TRUE),
(2, 'SBS-RAD-001', 1.0, 'manual', TRUE),
(3, 'SBS-CONS-001', 1.0, 'manual', TRUE);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

CREATE VIEW v_active_mappings AS
SELECT 
    fic.facility_id,
    f.facility_name,
    fic.internal_code,
    fic.local_description,
    snm.sbs_code,
    smc.description_en as sbs_description,
    snm.confidence,
    snm.mapping_source
FROM sbs_normalization_map snm
JOIN facility_internal_codes fic ON snm.internal_code_id = fic.internal_code_id
JOIN facilities f ON fic.facility_id = f.facility_id
JOIN sbs_master_catalogue smc ON snm.sbs_code = smc.sbs_id
WHERE snm.is_active = TRUE 
  AND fic.is_active = TRUE 
  AND f.is_active = TRUE;

CREATE VIEW v_recent_transactions AS
SELECT 
    nt.transaction_id,
    nt.transaction_uuid,
    f.facility_name,
    nt.request_type,
    nt.status,
    nt.submission_timestamp,
    nt.response_timestamp,
    nt.nphies_transaction_id,
    nt.http_status_code
FROM nphies_transactions nt
JOIN facilities f ON nt.facility_id = f.facility_id
ORDER BY nt.submission_timestamp DESC;

-- ============================================================================
-- 11. Healthcare System - Patient, Provider, Payer Tables
-- ============================================================================

-- Users table (extend existing if exists, or create)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'provider', 'payer', 'admin', 'clinician', 'coder')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) UNIQUE,
    patient_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    national_id VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    insurance_policy_id VARCHAR(50),
    insurance_payer_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Providers table (hospital/facility staff)
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) UNIQUE,
    provider_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    organization_name VARCHAR(100),
    license_number VARCHAR(50) UNIQUE NOT NULL,
    specialty VARCHAR(100),
    facility_id INT REFERENCES facilities(facility_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payers table (insurance companies)
CREATE TABLE IF NOT EXISTS payers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) UNIQUE,
    payer_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    company_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    nphies_payer_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update patient table with payer FK
ALTER TABLE patients ADD CONSTRAINT patients_payer_fk FOREIGN KEY (insurance_payer_id) REFERENCES payers(id);

-- ============================================================================
-- 12. Healthcare Service Management
-- ============================================================================

-- Services table (extend SBS catalogue with healthcare services)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ServiceRequest table (core healthcare request)
CREATE TABLE IF NOT EXISTS service_request (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    provider_id INT NOT NULL REFERENCES providers(id),
    payer_id INT REFERENCES payers(id),
    service_id INT REFERENCES services(id),
    facility_id INT REFERENCES facilities(facility_id),
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('prior_auth', 'claim', 'referral', 'eligibility')),
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'in_progress', 'completed', 'billed', 'paid', 'error')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
    details JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Foreign key to track parent NPHIES transaction
    nphies_transaction_uuid UUID REFERENCES nphies_transactions(transaction_uuid)
);

-- Prior Authorization table
CREATE TABLE IF NOT EXISTS prior_authorizations (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id) UNIQUE,
    prior_auth_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    authorization_number VARCHAR(100),
    start_date DATE,
    end_date DATE,
    service_codes TEXT[],
    diagnosis_codes TEXT[],
    approved_amount DECIMAL(10,2),
    approved_units INT,
    decision VARCHAR(20) CHECK (decision IN ('approved', 'denied', 'pending', 'pending_info')),
    decision_reason TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ServiceRequest attachments (documents, images, etc.)
CREATE TABLE IF NOT EXISTS service_request_attachments (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id) ON DELETE CASCADE,
    attachment_type VARCHAR(50) CHECK (attachment_type IN ('clinical_note', 'diagnostic_report', 'image', 'form', 'other')),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT REFERENCES users(id)
);

-- ============================================================================
-- 13. Claims Processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id) UNIQUE,
    claim_uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    claim_number VARCHAR(100) UNIQUE,
    claim_type VARCHAR(30) CHECK (claim_type IN ('professional', 'institutional', 'pharmacy', 'dental')),
    billed_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    claim_status VARCHAR(30) DEFAULT 'submitted' CHECK (claim_status IN ('submitted', 'approved', 'denied', 'paid', 'partial', 'reversed')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    adjustment_code VARCHAR(50),
    adjustment_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim line items
CREATE TABLE IF NOT EXISTS claim_line_items (
    id SERIAL PRIMARY KEY,
    claim_id INT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    service_code VARCHAR(20),
    service_description TEXT,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    diagnosis_code VARCHAR(20),
    procedure_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(claim_id, line_number)
);

-- ============================================================================
-- 14. Healthcare Workflow & Approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id),
    payer_id INT NOT NULL REFERENCES payers(id),
    approved BOOLEAN NOT NULL,
    comments TEXT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare request status history
CREATE TABLE IF NOT EXISTS request_status_history (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_by INT REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 15. Healthcare AI Features
-- ============================================================================

-- AI validation cache for healthcare claims
CREATE TABLE IF NOT EXISTS ai_claim_validation_cache (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES service_request(id),
    validation_type VARCHAR(50),
    input_hash VARCHAR(64) UNIQUE NOT NULL,
    validation_result JSONB,
    confidence_score FLOAT,
    is_valid BOOLEAN,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Denial prevention analysis
CREATE TABLE IF NOT EXISTS denial_prevention_analysis (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES service_request(id),
    denial_risk_score FLOAT CHECK (denial_risk_score BETWEEN 0 AND 1),
    risk_factors JSONB,
    recommended_actions JSONB,
    analysis_summary TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analyzed_by INT REFERENCES users(id)
);

-- ============================================================================
-- 16. Healthcare Analytics & Reporting
-- ============================================================================

-- Healthcare analytics events
CREATE TABLE IF NOT EXISTS healthcare_analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    user_id INT REFERENCES users(id),
    facility_id INT REFERENCES facilities(facility_id),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Healthcare key performance indicators
CREATE TABLE IF NOT EXISTS healthcare_kpis (
    id SERIAL PRIMARY KEY,
    kpi_name VARCHAR(100) NOT NULL,
    kpi_value DECIMAL(15,2),
    kpi_period DATE,
    facility_id INT REFERENCES facilities(facility_id),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Triggers for healthcare tables
-- ============================================================================

-- Update patients updated_at
CREATE OR REPLACE FUNCTION update_healthcare_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_providers_modtime BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_payers_modtime BEFORE UPDATE ON payers FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_services_modtime BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_servicerequest_modtime BEFORE UPDATE ON service_request FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_priorauth_modtime BEFORE UPDATE ON prior_authorizations FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();
CREATE TRIGGER update_claims_modtime BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_healthcare_updated_column();

-- Auto-update claim status from service_request status
CREATE OR REPLACE FUNCTION update_claim_status_from_request()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE claims
    SET claim_status = CASE
        WHEN NEW.status = 'completed' THEN 'submitted'
        WHEN NEW.status = 'paid' THEN 'paid'
        WHEN NEW.status = 'denied' THEN 'denied'
        ELSE claim_status
    END
    WHERE request_id = NEW.id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- Sample Healthcare Data
-- ============================================================================

-- Sample Users
INSERT INTO users (username, password_hash, email, phone, role, is_active) VALUES
('patient_john', '$2b$12$example', 'john@email.com', '555-0101', 'patient', TRUE),
('provider_smith', '$2b$12$example', 'smith@hospital.com', '555-0102', 'provider', TRUE),
('payer_bluecross', '$2b$12$example', 'claims@bluecross.com', '555-0103', 'payer', TRUE),
('admin_health', '$2b$12$example', 'admin@health.gov', '555-0104', 'admin', TRUE);

-- Sample Payers
INSERT INTO payers (user_id, company_name, contact_email, contact_phone, nphies_payer_id) VALUES
(3, 'Blue Cross Insurance', 'claims@bluecross.com', '555-0103', 'NPHIES-BC-001');

-- Sample Patients
INSERT INTO patients (user_id, national_id, date_of_birth, gender, insurance_policy_id, insurance_payer_id) VALUES
(1, '1234567890', '1985-05-20', 'male', 'POL123456789', 1);

-- Sample Providers
INSERT INTO providers (user_id, organization_name, license_number, specialty, facility_id) VALUES
(2, 'Central Hospital', 'MED-LIC-001', 'Internal Medicine', 1);

-- Sample Services
INSERT INTO services (code, name, description, default_price) VALUES
('99213', 'Office Visit (Level 3)', 'Standard office visit', 75.00),
('93000', 'ECG (12-lead)', '12-lead electrocardiogram', 150.00),
('73562', 'X-Ray Knee (2 views)', 'Knee X-ray with 2 views', 120.00);

-- ============================================================================
-- Healthcare Views
-- ============================================================================

-- View for patient requests
CREATE VIEW v_patient_requests AS
SELECT
    sr.id as request_id,
    sr.patient_id,
    p.national_id as patient_national_id,
    sr.provider_id,
    prov.organization_name as provider_name,
    sr.payer_id,
    pay.company_name as payer_name,
    sr.service_id,
    s.name as service_name,
    sr.request_type,
    sr.status,
    sr.submitted_at,
    sr.details
FROM service_request sr
LEFT JOIN patients p ON sr.patient_id = p.id
LEFT JOIN providers prov ON sr.provider_id = prov.id
LEFT JOIN payers pay ON sr.payer_id = pay.id
LEFT JOIN services s ON sr.service_id = s.id;

-- View for provider dashboard
CREATE VIEW v_provider_dashboard AS
SELECT
    pr.request_id,
    pr.patient_national_id,
    pr.provider_name,
    pr.request_type,
    pr.status,
    pr.submitted_at,
    pr.service_name,
    c.claim_status,
    pa.authorization_number,
    pa.decision
FROM v_patient_requests pr
LEFT JOIN claims c ON pr.request_id = c.request_id
LEFT JOIN prior_authorizations pa ON pr.request_id = pa.request_id;

-- View for payer dashboard
CREATE VIEW v_payer_dashboard AS
SELECT
    pr.request_id,
    pr.patient_national_id,
    pr.payer_name,
    pr.request_type,
    pr.status,
    pr.submitted_at,
    pr.service_name,
    pa.decision,
    pa.reviewed_at,
    c.paid_amount,
    c.claim_status
FROM v_patient_requests pr
LEFT JOIN prior_authorizations pa ON pr.request_id = pa.request_id
LEFT JOIN claims c ON pr.request_id = c.request_id
WHERE pr.payer_id IS NOT NULL;

-- View for admin dashboard (all requests)
CREATE VIEW v_admin_dashboard AS
SELECT
    pr.request_id,
    pr.patient_national_id,
    pr.provider_name,
    pr.payer_name,
    pr.request_type,
    pr.status,
    pr.submitted_at,
    pr.service_name,
    c.claim_status,
    c.billed_amount,
    c.paid_amount,
    pa.decision,
    pa.approved_amount
FROM v_patient_requests pr
LEFT JOIN claims c ON pr.request_id = c.request_id
LEFT JOIN prior_authorizations pa ON pr.request_id = pa.request_id;

-- ============================================================================
-- End of Schema
-- ============================================================================
