-- Healthcare Management System Schema
-- FHIR-Compliant Tables for NHIES Implementation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Healthcare Users Table
CREATE TABLE IF NOT EXISTS healthcare_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'provider', 'payer', 'admin')),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT chk_role CHECK (role IN ('patient', 'provider', 'payer', 'admin'))
);

CREATE INDEX idx_healthcare_users_username ON healthcare_users(username);
CREATE INDEX idx_healthcare_users_email ON healthcare_users(email);
CREATE INDEX idx_healthcare_users_role ON healthcare_users(role);

-- Healthcare Payers Table (Insurance Companies)
CREATE TABLE IF NOT EXISTS healthcare_payers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES healthcare_users(id) ON DELETE CASCADE,
    payer_identifier VARCHAR(50) UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100),
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    address_line TEXT,
    city VARCHAR(100),
    country VARCHAR(50) DEFAULT 'SA',
    is_active BOOLEAN DEFAULT TRUE,
    supported_services JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_payers_identifier ON healthcare_payers(payer_identifier);

-- Healthcare Patients Table
CREATE TABLE IF NOT EXISTS healthcare_patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES healthcare_users(id) ON DELETE CASCADE,
    patient_identifier VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    nationality VARCHAR(50),
    marital_status VARCHAR(20),
    address_line TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'SA',
    insurance_policy_id VARCHAR(100),
    insurance_payer_id INTEGER REFERENCES healthcare_payers(id),
    insurance_expiry DATE,
    fhir_extensions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_patients_identifier ON healthcare_patients(patient_identifier);
CREATE INDEX idx_healthcare_patients_insurance ON healthcare_patients(insurance_payer_id);

-- Healthcare Providers Table
CREATE TABLE IF NOT EXISTS healthcare_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES healthcare_users(id) ON DELETE CASCADE,
    provider_identifier VARCHAR(50) UNIQUE,
    organization_name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100),
    specialty VARCHAR(100),
    address_line TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'SA',
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    fhir_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_providers_identifier ON healthcare_providers(provider_identifier);

-- Healthcare Services Catalog
CREATE TABLE IF NOT EXISTS healthcare_services (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    code_system VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    default_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'SAR',
    fhir_coding JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    requires_preauth BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_services_code ON healthcare_services(code);
CREATE INDEX idx_healthcare_services_category ON healthcare_services(category);

-- Healthcare Requests (Unified Submission)
CREATE TABLE IF NOT EXISTS healthcare_requests (
    id SERIAL PRIMARY KEY,
    request_uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('prior_auth', 'claim', 'referral', 'eligibility')),
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'in_progress', 'completed', 'billed', 'paid', 'cancelled')),
    patient_id INTEGER NOT NULL REFERENCES healthcare_patients(id),
    provider_id INTEGER NOT NULL REFERENCES healthcare_providers(id),
    payer_id INTEGER REFERENCES healthcare_payers(id),
    service_id INTEGER REFERENCES healthcare_services(id),
    service_date DATE,
    fhir_resource JSONB,
    diagnosis_codes JSONB,
    procedure_codes JSONB,
    clinical_notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'stat')),
    estimated_cost DECIMAL(10, 2),
    approved_amount DECIMAL(10, 2),
    nphies_transaction_id VARCHAR(100),
    masterlinc_workflow_id VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_requests_uuid ON healthcare_requests(request_uuid);
CREATE INDEX idx_healthcare_requests_type ON healthcare_requests(request_type);
CREATE INDEX idx_healthcare_requests_status ON healthcare_requests(status);
CREATE INDEX idx_healthcare_requests_patient ON healthcare_requests(patient_id);
CREATE INDEX idx_healthcare_requests_provider ON healthcare_requests(provider_id);
CREATE INDEX idx_healthcare_requests_payer ON healthcare_requests(payer_id);
CREATE INDEX idx_healthcare_requests_submitted ON healthcare_requests(submitted_at);

-- Healthcare Approvals
CREATE TABLE IF NOT EXISTS healthcare_approvals (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES healthcare_requests(id) ON DELETE CASCADE,
    payer_id INTEGER NOT NULL REFERENCES healthcare_payers(id),
    approved BOOLEAN NOT NULL,
    approval_code VARCHAR(100),
    comments TEXT,
    conditions JSONB,
    approved_amount DECIMAL(10, 2),
    reviewer_name VARCHAR(200),
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_healthcare_approvals_request ON healthcare_approvals(request_id);
CREATE INDEX idx_healthcare_approvals_payer ON healthcare_approvals(payer_id);

-- Healthcare Claims
CREATE TABLE IF NOT EXISTS healthcare_claims (
    id SERIAL PRIMARY KEY,
    request_id INTEGER UNIQUE REFERENCES healthcare_requests(id) ON DELETE CASCADE,
    claim_number VARCHAR(100) UNIQUE,
    billed_amount DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2),
    patient_responsibility DECIMAL(10, 2),
    claim_status VARCHAR(50) DEFAULT 'submitted',
    denial_reason TEXT,
    payment_reference VARCHAR(100),
    payment_date DATE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE INDEX idx_healthcare_claims_number ON healthcare_claims(claim_number);
CREATE INDEX idx_healthcare_claims_request ON healthcare_claims(request_id);
CREATE INDEX idx_healthcare_claims_status ON healthcare_claims(claim_status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_healthcare_users_updated_at BEFORE UPDATE ON healthcare_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_healthcare_patients_updated_at BEFORE UPDATE ON healthcare_patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_healthcare_providers_updated_at BEFORE UPDATE ON healthcare_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_healthcare_payers_updated_at BEFORE UPDATE ON healthcare_payers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_healthcare_services_updated_at BEFORE UPDATE ON healthcare_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_healthcare_requests_updated_at BEFORE UPDATE ON healthcare_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
