#!/usr/bin/env python3
"""
SBS Database Importer
Imports all 20,403 official CHI SBS codes into PostgreSQL database
"""

import json
import os
import sys
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Installing psycopg2...")
    os.system("pip3 install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import execute_values

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "sbs_integration"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\nMake sure PostgreSQL is running and the database exists.")
        print("You can create the database with: CREATE DATABASE sbs_integration;")
        sys.exit(1)

def create_tables(conn):
    """Create all required tables"""
    print("📋 Creating database tables...")
    
    with conn.cursor() as cur:
        cur.execute("""
            -- Drop existing tables
            DROP TABLE IF EXISTS claim_items CASCADE;
            DROP TABLE IF EXISTS claims CASCADE;
            DROP TABLE IF EXISTS prior_authorizations CASCADE;
            DROP TABLE IF EXISTS eligibility_cache CASCADE;
            DROP TABLE IF EXISTS bundle_items CASCADE;
            DROP TABLE IF EXISTS service_bundles CASCADE;
            DROP TABLE IF EXISTS pricing_tier_rules CASCADE;
            DROP TABLE IF EXISTS facilities CASCADE;
            DROP TABLE IF EXISTS sbs_achi_map CASCADE;
            DROP TABLE IF EXISTS sbs_snomed_map CASCADE;
            DROP TABLE IF EXISTS sbs_master_catalogue CASCADE;
            DROP TABLE IF EXISTS sbs_categories CASCADE;
            
            -- Categories table
            CREATE TABLE sbs_categories (
                category_id SERIAL PRIMARY KEY,
                category_code VARCHAR(20) NOT NULL UNIQUE,
                category_name VARCHAR(255) NOT NULL,
                category_name_ar VARCHAR(255),
                parent_category_id INTEGER REFERENCES sbs_categories(category_id),
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Main SBS catalogue
            CREATE TABLE sbs_master_catalogue (
                id SERIAL PRIMARY KEY,
                sbs_id VARCHAR(20) NOT NULL UNIQUE,
                sbs_code VARCHAR(20) NOT NULL,
                description_en TEXT NOT NULL,
                description_ar TEXT,
                category_id INTEGER REFERENCES sbs_categories(category_id),
                subcategory VARCHAR(255),
                block_code VARCHAR(50),
                chapter VARCHAR(100),
                standard_price DECIMAL(10, 2) DEFAULT 0,
                requires_prior_auth BOOLEAN DEFAULT FALSE,
                requires_diagnosis BOOLEAN DEFAULT FALSE,
                gender_restriction VARCHAR(10),
                age_min INTEGER,
                age_max INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                version VARCHAR(10) DEFAULT '3.1',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_sbs_code ON sbs_master_catalogue(sbs_code);
            CREATE INDEX idx_sbs_subcategory ON sbs_master_catalogue(subcategory);
            CREATE INDEX idx_sbs_active ON sbs_master_catalogue(is_active);
            CREATE INDEX idx_sbs_description ON sbs_master_catalogue USING GIN (to_tsvector('english', description_en));
            
            -- Facilities table
            CREATE TABLE facilities (
                facility_id SERIAL PRIMARY KEY,
                facility_code VARCHAR(50) NOT NULL UNIQUE,
                facility_name VARCHAR(255) NOT NULL,
                facility_name_ar VARCHAR(255),
                facility_type VARCHAR(50),
                accreditation_tier CHAR(1) DEFAULT 'C',
                region VARCHAR(100),
                city VARCHAR(100),
                nphies_id VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Pricing tier rules
            CREATE TABLE pricing_tier_rules (
                tier_id SERIAL PRIMARY KEY,
                tier_level CHAR(1) NOT NULL UNIQUE,
                tier_description VARCHAR(255),
                markup_pct DECIMAL(5, 2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE
            );
            
            -- Insert pricing tiers
            INSERT INTO pricing_tier_rules (tier_level, tier_description, markup_pct) VALUES
            ('A', 'Premium/Tertiary Centers', 20.00),
            ('B', 'Standard Hospitals', 10.00),
            ('C', 'Primary Care Centers', 0.00),
            ('D', 'Clinics/Outpatient', -5.00);
            
            -- Service bundles
            CREATE TABLE service_bundles (
                bundle_id SERIAL PRIMARY KEY,
                bundle_code VARCHAR(50) NOT NULL UNIQUE,
                bundle_name VARCHAR(255) NOT NULL,
                bundle_name_ar VARCHAR(255),
                bundle_description TEXT,
                total_allowed_price DECIMAL(10, 2),
                min_items_required INTEGER DEFAULT 2,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Bundle items
            CREATE TABLE bundle_items (
                id SERIAL PRIMARY KEY,
                bundle_id INTEGER NOT NULL REFERENCES service_bundles(bundle_id),
                sbs_code VARCHAR(20) NOT NULL,
                is_required BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0
            );
            
            -- Prior authorizations
            CREATE TABLE prior_authorizations (
                pa_id SERIAL PRIMARY KEY,
                pa_number VARCHAR(50) NOT NULL UNIQUE,
                patient_id VARCHAR(50) NOT NULL,
                facility_id INTEGER REFERENCES facilities(facility_id),
                sbs_code VARCHAR(20) NOT NULL,
                description TEXT,
                requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expected_date DATE,
                status VARCHAR(20) DEFAULT 'pending',
                nphies_reference VARCHAR(100),
                approved_date TIMESTAMP,
                expiry_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_pa_patient ON prior_authorizations(patient_id);
            CREATE INDEX idx_pa_status ON prior_authorizations(status);
            
            -- Eligibility cache
            CREATE TABLE eligibility_cache (
                id SERIAL PRIMARY KEY,
                patient_id VARCHAR(50) NOT NULL,
                payer_id VARCHAR(50),
                policy_number VARCHAR(100),
                coverage_start DATE,
                coverage_end DATE,
                coverage_status VARCHAR(20),
                benefit_class VARCHAR(50),
                inpatient_limit DECIMAL(12, 2),
                outpatient_limit DECIMAL(12, 2),
                dental_limit DECIMAL(12, 2),
                optical_limit DECIMAL(12, 2),
                maternity_covered BOOLEAN DEFAULT FALSE,
                chronic_covered BOOLEAN DEFAULT FALSE,
                last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                nphies_response JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_eligibility_patient ON eligibility_cache(patient_id);
            CREATE INDEX idx_eligibility_verified ON eligibility_cache(last_verified);
            
            -- Claims table
            CREATE TABLE claims (
                claim_id SERIAL PRIMARY KEY,
                claim_number VARCHAR(50) NOT NULL UNIQUE,
                patient_id VARCHAR(50) NOT NULL,
                facility_id INTEGER REFERENCES facilities(facility_id),
                claim_type VARCHAR(20) DEFAULT 'institutional',
                service_date DATE,
                submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_amount DECIMAL(12, 2) DEFAULT 0,
                approved_amount DECIMAL(12, 2),
                status VARCHAR(30) DEFAULT 'draft',
                nphies_reference VARCHAR(100),
                nphies_response JSONB,
                prior_auth_number VARCHAR(50),
                bundle_applied BOOLEAN DEFAULT FALSE,
                bundle_id INTEGER REFERENCES service_bundles(bundle_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_claims_patient ON claims(patient_id);
            CREATE INDEX idx_claims_status ON claims(status);
            CREATE INDEX idx_claims_date ON claims(submission_date);
            
            -- Claim items
            CREATE TABLE claim_items (
                item_id SERIAL PRIMARY KEY,
                claim_id INTEGER NOT NULL REFERENCES claims(claim_id),
                sequence INTEGER DEFAULT 1,
                sbs_code VARCHAR(20) NOT NULL,
                description TEXT,
                quantity INTEGER DEFAULT 1,
                unit_price DECIMAL(10, 2),
                net_price DECIMAL(10, 2),
                status VARCHAR(20) DEFAULT 'pending',
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX idx_claim_items_claim ON claim_items(claim_id);
            
            -- Insert sample bundles
            INSERT INTO service_bundles (bundle_code, bundle_name, total_allowed_price, min_items_required) VALUES
            ('BUNDLE-KNEE-REPLACE', 'Total Knee Replacement Bundle', 45000.00, 3),
            ('BUNDLE-CARDIAC-CATH', 'Cardiac Catheterization Bundle', 25000.00, 4),
            ('BUNDLE-CABG', 'Coronary Artery Bypass Bundle', 85000.00, 5),
            ('BUNDLE-MATERNITY', 'Normal Delivery Package', 12000.00, 3),
            ('BUNDLE-LAPCHOL', 'Laparoscopic Cholecystectomy Bundle', 15000.00, 3),
            ('BUNDLE-APPENDIX', 'Appendectomy Bundle', 12000.00, 3);
            
            -- Insert sample facilities
            INSERT INTO facilities (facility_code, facility_name, facility_type, accreditation_tier, region, city) VALUES
            ('FAC001', 'King Faisal Specialist Hospital', 'Tertiary', 'A', 'Riyadh', 'Riyadh'),
            ('FAC002', 'Saudi German Hospital', 'Private Hospital', 'A', 'Riyadh', 'Riyadh'),
            ('FAC003', 'Al Habib Medical Group', 'Private Hospital', 'B', 'Riyadh', 'Riyadh'),
            ('FAC004', 'Dallah Hospital', 'Private Hospital', 'B', 'Riyadh', 'Riyadh'),
            ('FAC005', 'Central Health Clinic', 'Primary Care', 'C', 'Riyadh', 'Riyadh'),
            ('FAC006', 'Al Noor Specialist Hospital', 'Private Hospital', 'B', 'Makkah', 'Makkah'),
            ('FAC007', 'King Abdullah Medical City', 'Tertiary', 'A', 'Makkah', 'Makkah'),
            ('FAC008', 'Saad Specialist Hospital', 'Private Hospital', 'A', 'Eastern', 'Al Khobar');
        """)
        
        conn.commit()
        print("✅ Tables created successfully")

def import_sbs_codes(conn):
    """Import all SBS codes from JSON"""
    print("\n📦 Importing SBS codes...")
    
    # Load the catalogue
    json_path = os.path.join(os.path.dirname(__file__), 'processed', 'sbs_catalogue.json')
    
    if not os.path.exists(json_path):
        print(f"❌ File not found: {json_path}")
        return 0
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    codes = data.get('catalogue', [])
    print(f"   Found {len(codes)} codes to import")
    
    # Prepare data for bulk insert
    values = []
    for entry in codes:
        sbs_id = entry.get('sbs_id')
        if sbs_id:
            values.append((
                sbs_id,
                entry.get('sbs_code', sbs_id),
                entry.get('description_en', 'Unknown'),
                entry.get('description_ar'),
                entry.get('subcategory'),
                entry.get('category'),
                0,  # standard_price (will be updated later)
                False,  # requires_prior_auth
                False,  # requires_diagnosis
                True,   # is_active
                '3.1'   # version
            ))
    
    # Bulk insert
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO sbs_master_catalogue 
            (sbs_id, sbs_code, description_en, description_ar, subcategory, chapter, 
             standard_price, requires_prior_auth, requires_diagnosis, is_active, version)
            VALUES %s
            ON CONFLICT (sbs_id) DO UPDATE SET
                description_en = EXCLUDED.description_en,
                subcategory = EXCLUDED.subcategory
            """,
            values,
            page_size=1000
        )
        conn.commit()
    
    print(f"✅ Imported {len(values)} SBS codes")
    return len(values)

def set_prior_auth_requirements(conn):
    """Set prior authorization requirements for high-value procedures"""
    print("\n🔒 Setting prior authorization requirements...")
    
    with conn.cursor() as cur:
        # High-value surgical procedures
        cur.execute("""
            UPDATE sbs_master_catalogue 
            SET requires_prior_auth = TRUE,
                standard_price = CASE 
                    WHEN subcategory ILIKE '%heart%' OR subcategory ILIKE '%cardiac%' THEN 50000
                    WHEN subcategory ILIKE '%brain%' OR subcategory ILIKE '%cranial%' THEN 40000
                    WHEN subcategory ILIKE '%spine%' OR subcategory ILIKE '%spinal%' THEN 35000
                    WHEN subcategory ILIKE '%joint%' OR subcategory ILIKE '%replacement%' THEN 30000
                    WHEN subcategory ILIKE '%transplant%' THEN 100000
                    ELSE 20000
                END
            WHERE subcategory ILIKE ANY(ARRAY[
                '%heart%', '%cardiac%', '%coronary%',
                '%brain%', '%cranial%', '%neurosurgery%',
                '%spine%', '%spinal%', '%vertebr%',
                '%joint replacement%', '%arthroplasty%',
                '%transplant%', '%bypass%',
                '%cancer%', '%oncology%', '%tumor%'
            ])
        """)
        
        # Set standard prices for common procedures
        cur.execute("""
            UPDATE sbs_master_catalogue
            SET standard_price = CASE
                WHEN subcategory ILIKE '%consultation%' THEN 300
                WHEN subcategory ILIKE '%examination%' THEN 200
                WHEN subcategory ILIKE '%laboratory%' OR subcategory ILIKE '%blood%' THEN 150
                WHEN subcategory ILIKE '%x-ray%' OR subcategory ILIKE '%radiograph%' THEN 200
                WHEN subcategory ILIKE '%ultrasound%' THEN 400
                WHEN subcategory ILIKE '%ct%' OR subcategory ILIKE '%computed%' THEN 800
                WHEN subcategory ILIKE '%mri%' OR subcategory ILIKE '%magnetic%' THEN 1500
                WHEN subcategory ILIKE '%endoscopy%' THEN 2000
                WHEN subcategory ILIKE '%biopsy%' THEN 1000
                WHEN subcategory ILIKE '%suture%' OR subcategory ILIKE '%wound%' THEN 500
                ELSE 250
            END
            WHERE standard_price = 0 OR standard_price IS NULL
        """)
        
        conn.commit()
        
        # Count updated
        cur.execute("SELECT COUNT(*) FROM sbs_master_catalogue WHERE requires_prior_auth = TRUE")
        pa_count = cur.fetchone()[0]
        
        print(f"✅ Set {pa_count} procedures as requiring prior authorization")

def import_bundle_items(conn):
    """Import bundle item associations"""
    print("\n📦 Setting up bundle items...")
    
    with conn.cursor() as cur:
        # Knee replacement bundle
        cur.execute("""
            INSERT INTO bundle_items (bundle_id, sbs_code, is_required) 
            SELECT 
                (SELECT bundle_id FROM service_bundles WHERE bundle_code = 'BUNDLE-KNEE-REPLACE'),
                sbs_id,
                TRUE
            FROM sbs_master_catalogue 
            WHERE subcategory ILIKE '%knee%' 
              AND (description_en ILIKE '%replacement%' OR description_en ILIKE '%arthroplasty%')
            LIMIT 5
            ON CONFLICT DO NOTHING
        """)
        
        # Cardiac catheterization bundle
        cur.execute("""
            INSERT INTO bundle_items (bundle_id, sbs_code, is_required)
            SELECT
                (SELECT bundle_id FROM service_bundles WHERE bundle_code = 'BUNDLE-CARDIAC-CATH'),
                sbs_id,
                TRUE
            FROM sbs_master_catalogue
            WHERE subcategory ILIKE '%heart%' OR subcategory ILIKE '%cardiac%'
            LIMIT 5
            ON CONFLICT DO NOTHING
        """)
        
        conn.commit()
        print("✅ Bundle items configured")

def print_summary(conn):
    """Print import summary"""
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM sbs_master_catalogue")
        sbs_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM sbs_master_catalogue WHERE requires_prior_auth = TRUE")
        pa_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM service_bundles")
        bundle_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM facilities")
        facility_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM pricing_tier_rules")
        tier_count = cur.fetchone()[0]
        
        print(f"   📋 SBS Codes:             {sbs_count:,}")
        print(f"   🔒 Prior Auth Required:   {pa_count:,}")
        print(f"   📦 Service Bundles:       {bundle_count}")
        print(f"   🏥 Facilities:            {facility_count}")
        print(f"   💰 Pricing Tiers:         {tier_count}")
    
    print("="*60)
    print("✅ Database import completed successfully!")
    print("="*60)

def main():
    """Main import function"""
    print("="*60)
    print("🏥 SBS Database Importer")
    print("   Importing official CHI SBS V3.1 codes")
    print("="*60)
    
    conn = get_connection()
    
    try:
        create_tables(conn)
        import_sbs_codes(conn)
        set_prior_auth_requirements(conn)
        import_bundle_items(conn)
        print_summary(conn)
    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
